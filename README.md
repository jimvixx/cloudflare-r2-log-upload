# cloudflare-r2-log-upload

A generic serverless log upload backend built on Cloudflare Workers and Cloudflare R2.

This project provides a simple API for uploading compressed log archives from native applications, CLI tools, and backend services without running servers or managing infrastructure.

## Features

- Cloudflare Workers backend
- Cloudflare R2 object storage
- GitHub Actions CI/CD deployment
- TypeScript implementation
- Configurable upload size limits
- ZIP/GZIP upload support
- Metadata stored with uploaded objects
- Automatic lifecycle cleanup
- No secrets embedded in client applications
- Versioned releases

## Architecture

```text
Native App / CLI
        |
        v
Cloudflare Worker
        |
        v
Cloudflare R2
        |
        v
Lifecycle Cleanup
```

## Repository Structure

```text
.
├── worker/
│   ├── src/
│   ├── package.json
│   └── wrangler.jsonc.example
├── docs/
│   ├── api.md
│   └── lifecycle.md
└── .github/workflows/
```

## Quick Start

### Requirements

- Node.js 22+
- npm
- Cloudflare account
- Wrangler CLI

### Install

```bash
npm ci
npm run check
```

### Deploy

```bash
npx wrangler deploy
```

## Cloudflare Setup

1. Create an R2 bucket.
2. Create a Worker.
3. Configure R2 binding.
4. Configure upload size limit.
5. Deploy using Wrangler or GitHub Actions.

## CI/CD

This repository supports automated deployment using GitHub Actions.

Workflow:

```text
git push
    |
    v
GitHub Actions
    |
    v
Cloudflare Worker Deploy
```

## API Documentation

See:

- docs/api.md

## Lifecycle Cleanup

See:

- docs/lifecycle.md

Recommended retention:

- 7 days for privacy-focused deployments
- 14 days for application support logs
- 30 days for extended diagnostics

## Security Model

This project intentionally avoids embedding secrets in client applications.

Protection is based on:

- upload size limits
- accepted content types
- lifecycle cleanup
- client metadata
- operational monitoring

## Example Request

```http
POST /
Content-Type: application/zip
X-Client: ExampleApp
```

## Release Process

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Deployments are performed through GitHub Actions.

## Roadmap

- Rate limiting
- Upload analytics
- Optional signed uploads
- Multi-bucket support
- Dashboard integration

## License

MIT License
