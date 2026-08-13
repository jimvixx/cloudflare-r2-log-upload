export interface Env {
  LOGS_BUCKET: R2Bucket;
  UPLOAD_IP_RATE_LIMITER: RateLimit;
  UPLOAD_GLOBAL_RATE_LIMITER: RateLimit;
  MAX_UPLOAD_BYTES?: string;
}

const DEFAULT_MAX_UPLOAD_BYTES = 1_048_576;
const MAX_CLIENT_NAME_LENGTH = 64;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (request.headers.get("origin")) {
      return json({ error: "Browser uploads are not supported" }, 403);
    }

    const client = request.headers.get("x-client")?.trim();

    if (!client || client.length > MAX_CLIENT_NAME_LENGTH) {
      return json({ error: "Missing or invalid X-Client header" }, 400);
    }

    const contentTypeHeader = request.headers.get("content-type") ?? "";
    const contentType = contentTypeHeader
      .split(";", 1)[0]
      .trim()
      .toLowerCase();

    const allowedTypes = new Set([
      "application/zip",
      "application/gzip",
      "application/x-gzip",
      "application/octet-stream"
    ]);

    if (!allowedTypes.has(contentType)) {
      return json({ error: "Unsupported media type" }, 415);
    }

    const configuredMaxBytes = Number(
      env.MAX_UPLOAD_BYTES ?? DEFAULT_MAX_UPLOAD_BYTES
    );

    const maxBytes =
      Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0
        ? configuredMaxBytes
        : DEFAULT_MAX_UPLOAD_BYTES;

    const contentLengthHeader = request.headers.get("content-length");
    const contentLength = Number(contentLengthHeader ?? "0");

    if (
      !contentLengthHeader ||
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > maxBytes
    ) {
      return json({ error: "Payload too large" }, 413);
    }

    const clientIp =
      request.headers.get("cf-connecting-ip") ?? "unknown";

    const ipRateLimit = await env.UPLOAD_IP_RATE_LIMITER.limit({
      key: clientIp
    });

    if (!ipRateLimit.success) {
      return json({ error: "Too many requests" }, 429);
    }

    const globalRateLimit = await env.UPLOAD_GLOBAL_RATE_LIMITER.limit({
      key: "uploads"
    });

    if (!globalRateLimit.success) {
      return json({ error: "Upload capacity temporarily exceeded" }, 429);
    }

    const body = await request.arrayBuffer();

    if (body.byteLength > maxBytes) {
      return json({ error: "Payload too large" }, 413);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const key = `logs/${now.slice(0, 10)}/${id}.zip`;

    await env.LOGS_BUCKET.put(key, body, {
      httpMetadata: {
        contentType
      },
      customMetadata: {
        uploadedAt: now,
        originalSize: String(body.byteLength),
        contentType,
        client
      }
    });

    return json(
      {
        id,
        key,
        size: body.byteLength
      },
      201
    );
  }
} satisfies ExportedHandler<Env>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
