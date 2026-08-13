# cloudflare-r2-log-upload

A generic serverless backend for uploading compressed application logs to Cloudflare R2 through Cloudflare Workers.

The project is designed for native applications, CLI tools, and backend services that need temporary diagnostic log storage without running a dedicated server or embedding upload secrets in client applications.

## Features

- Cloudflare Workers upload endpoint
- Cloudflare R2 object storage
- TypeScript implementation
- GitHub Actions compatible deployment
- Configurable maximum upload size
- ZIP/GZIP content type validation
- Required client metadata via `X-Client`
- Browser-originated upload rejection
- Per-IP upload rate limiting
- Per-location aggregate upload rate limiting
- R2 lifecycle cleanup for temporary logs
- No upload secret required in client applications
- Versioned backend releases

## Architecture

```text
Native App / CLI
        |
        | HTTPS POST
        v
Cloudflare Worker
        |
        |-- Request validation
        |-- Size limit
        |-- Per-IP rate limit
        |-- Per-location aggregate rate limit
        |
        v
Cloudflare R2
        |
        v
Lifecycle Cleanup
```

## Request Flow

Valid uploads pass through the following checks before an R2 write is performed:

```text
POST request?
    |
No  -> 405
    |
Yes
    v
Browser Origin header present?
    |
Yes -> 403
    |
No
    v
X-Client present?
    |
No  -> 400
    |
Yes
    v
Supported Content-Type?
    |
No  -> 415
    |
Yes
    v
Content-Length within limit?
    |
No  -> 413
    |
Yes
    v
Per-IP rate limit allowed?
    |
No  -> 429
    |
Yes
    v
Aggregate rate limit allowed?
    |
No  -> 429
    |
Yes
    v
Read request body
    |
    v
Actual size within limit?
    |
No  -> 413
    |
Yes
    v
R2.put()
```

## Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── deploy-worker.example.yml
├── docs/
│   ├── api.md
│   └── lifecycle.md
├── worker/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── wrangler.jsonc.example
├── .gitignore
├── .nvmrc
└── README.md
```

## Requirements

- Node.js 22+
- npm
- Cloudflare account
- Wrangler 4.36.0 or later
- Cloudflare R2 enabled

## Local Setup

Install dependencies:

```bash
cd worker
npm ci
```

Run the TypeScript check:

```bash
npm run check
```

Copy the example Wrangler configuration and adjust it for your deployment:

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

The real `wrangler.jsonc` should remain deployment-specific and should not be committed if it contains environment-specific configuration.

## Cloudflare Resources

A deployment requires:

- one Cloudflare Worker;
- one R2 bucket;
- an R2 binding named `LOGS_BUCKET`;
- a rate limiting binding named `UPLOAD_IP_RATE_LIMITER`;
- a rate limiting binding named `UPLOAD_GLOBAL_RATE_LIMITER`;
- `MAX_UPLOAD_BYTES` configured as a Worker variable.

Example rate limits:

```text
Per IP:       5 uploads / 60 seconds
Aggregate:   30 uploads / 60 seconds per Cloudflare location
```

The namespace IDs used by rate limiting bindings must be positive integer strings and unique within the Cloudflare account unless sharing counters is intentional.

## API

Example request:

```http
POST /
Content-Type: application/zip
X-Client: ExampleApp
```

The request format is intentionally simple and does not require a client-side secret.

See [docs/api.md](docs/api.md) for the API contract.

## Successful Response

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "key": "logs/2026-08-13/00000000-0000-0000-0000-000000000000.zip",
  "size": 123456
}
```

## Error Responses

Typical responses include:

| Status | Meaning |
|---|---|
| `400` | Required client metadata is missing or invalid |
| `403` | Browser-originated uploads are not supported |
| `405` | Only `POST` is supported |
| `413` | Payload exceeds the configured size limit |
| `415` | Unsupported media type |
| `429` | Upload rate limit exceeded |

## Abuse and Cost Protection

The backend is designed to reduce the impact of automated abuse before it reaches R2.

Protection includes:

- maximum request size checks before reading the body;
- actual body size verification;
- restricted content types;
- per-IP rate limiting;
- aggregate rate limiting;
- short object retention through R2 lifecycle rules.

Rate limiting is intentionally performed before `request.arrayBuffer()` and before `R2.put()`.

### Important limitations

Cloudflare Workers Rate Limiting is intended for abuse protection, not exact accounting.

Rate limit state is local to a Cloudflare location and is eventually consistent. A distributed attack reaching multiple Cloudflare locations can therefore exceed a single-location limit.

IP-based limiting can also affect multiple legitimate users that share an address through carrier-grade NAT, corporate networks, VPNs, or privacy proxies. The default limits in this repository are intentionally conservative but should be adjusted for the expected traffic pattern.

For applications that require stronger identity-based controls, consider authenticated users, signed requests, or application-specific device credentials.

## Lifecycle Cleanup

Uploaded objects are stored under:

```text
logs/YYYY-MM-DD/<uuid>.zip
```

R2 lifecycle rules should automatically remove old uploads.

See [docs/lifecycle.md](docs/lifecycle.md).

Typical retention periods:

- 7 days for privacy-focused deployments
- 14 days for application support logs
- 30 days for extended diagnostics

## CI/CD

The repository contains an example GitHub Actions deployment workflow.

A deployment-owning application repository can check out a tagged version of this repository and generate its environment-specific Wrangler configuration during CI:

```text
Application repository
        |
        | checkout pinned backend tag
        v
cloudflare-r2-log-upload
        |
        | npm ci
        | npm run check
        | generate wrangler.jsonc
        v
wrangler deploy
        |
        v
Cloudflare Worker
```

This keeps the backend implementation generic while the consuming application owns:

- Cloudflare API credentials;
- account ID;
- Worker name;
- R2 bucket name;
- upload size limit;
- rate limit values;
- rate limit namespace IDs.

## Deployment Variables

A deployment workflow can define the following non-secret variables:

```text
CF_WORKER_NAME
CF_R2_BUCKET_NAME
MAX_UPLOAD_BYTES
CF_RATE_LIMIT_IP
CF_RATE_LIMIT_GLOBAL
CF_RATE_LIMIT_PERIOD
CF_RATE_NAMESPACE_IP
CF_RATE_NAMESPACE_GLOBAL
```

Recommended starting values:

```text
MAX_UPLOAD_BYTES=1048576
CF_RATE_LIMIT_IP=5
CF_RATE_LIMIT_GLOBAL=30
CF_RATE_LIMIT_PERIOD=60
CF_RATE_NAMESPACE_IP=1001
CF_RATE_NAMESPACE_GLOBAL=1002
```

Cloudflare currently requires the rate limit period to be either `10` or `60` seconds.

## Deployment Secrets

CI/CD should keep Cloudflare credentials outside the repository.

Typical GitHub Actions secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

## Release Process

Create a versioned release after validating the Worker:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Consuming repositories should pin a specific tag rather than deploy directly from `main`.

## Roadmap

Potential future improvements:

- upload observability and dashboards
- automated abuse alerts
- optional signed uploads
- authenticated identity-based rate limiting
- multi-bucket support
- custom-domain deployment examples
