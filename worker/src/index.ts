export interface Env {
  LOGS_BUCKET: R2Bucket;
  LOG_UPLOAD_TOKEN: string;
  MAX_UPLOAD_BYTES?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const token = request.headers.get("x-upload-token");
    if (!env.LOG_UPLOAD_TOKEN || token !== env.LOG_UPLOAD_TOKEN) {
      return json({ error: "Unauthorized" }, 401);
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
        contentType: request.headers.get("content-type") ?? "application/zip"
      },
      customMetadata: {
        uploadedAt: now,
        originalSize: String(body.byteLength)
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
