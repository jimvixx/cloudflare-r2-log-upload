# API contract

## Upload logs

Uploads a compressed application log file to Cloudflare R2.

```http
POST /
Content-Type: application/zip
X-Client: ExampleApp
```

## Required headers

| Header | Description |
|---|---|
| Content-Type | Must be one of application/zip, application/gzip, application/x-gzip, or application/octet-stream. |
| X-Client | Non-empty client/application identifier. Example: SMSecure. |

## Browser uploads

Browser-originated uploads are rejected. Requests containing an Origin header return 403.

This backend is intended for native applications, CLI tools, or server-side clients.

## Successful response

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "key": "logs/2026-06-22/00000000-0000-0000-0000-000000000000.zip",
  "size": 123456
}
```

## Error responses

| Status | Meaning |
|---|---|
| 400 | Missing required request metadata. |
| 403 | Browser uploads are not supported. |
| 405 | Only POST is allowed. |
| 413 | Payload is larger than the configured limit. |
| 415 | Unsupported media type. |

## Storage layout

Objects are stored under the logs/YYYY-MM-DD/ prefix.

```text
logs/2026-06-22/00000000-0000-0000-0000-000000000000.zip
```

## Notes

This project intentionally does not require an upload secret in the client application.

For public native apps, embedded API secrets can be extracted from the application package. This backend instead relies on:

- strict payload size limits
- compressed log-only content types
- short R2 lifecycle retention
- client metadata
- server-side operational monitoring
