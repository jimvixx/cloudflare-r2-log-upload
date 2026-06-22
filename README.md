# cloudflare-r2-log-upload

Generic Cloudflare Worker + R2 backend for receiving application log uploads.

## Goals

- Accept log uploads via HTTPS POST
- Store log files in Cloudflare R2
- Avoid storing secrets in the repository
- Support deployment from another repository via GitHub Actions
- Provide cost-control and abuse-prevention mechanisms

## Planned features

- Max upload size limit
- Upload token validation
- R2 object storage
- Automatic cleanup via lifecycle rules
- GitHub Actions deployment
- Terraform-based infrastructure

