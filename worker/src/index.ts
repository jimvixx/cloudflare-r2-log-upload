export interface Env {
  LOGS_BUCKET: R2Bucket;
  MAX_UPLOAD_BYTES?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const contentType = request.headers.get("content-type") ?? "";

    const allowedTypes = [
      "application/zip",
      "application/gzip",
      "application/x-gzip",
      "application/octet-stream"
    ];

    if (!allowedTypes.some(type => contentType.includes(type))) {
      return json({ error: "Unsupported media type" }, 415);
    }

    const maxBytes = Number(env.MAX_UPLOAD_BYTES ?? "1048576");
    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (!contentLength || contentLength > maxBytes) {
      return json({ error: "Payload too large" }, 413);
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
        contentType
      }
    });

    return json({
      id,
      key,
      size: body.byteLength
    }, 201);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
