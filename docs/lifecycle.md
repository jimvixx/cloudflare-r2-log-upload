# R2 lifecycle cleanup

This project is designed to store uploaded logs under the `logs/` prefix.

Example object key:

```text
logs/2026-06-22/00000000-0000-0000-0000-000000000000.zip
```

To automatically delete old uploaded logs, configure an R2 lifecycle rule:

```bash
npx wrangler r2 bucket lifecycle add <bucket-name> delete-old-logs logs/ --expire-days 14
```

Verify lifecycle rules:

```bash
npx wrangler r2 bucket lifecycle list <bucket-name>
```

Recommended retention:

- 7 days for privacy-first deployments
- 14 days for small application projects
- 30 days if issue investigation often takes longer

The lifecycle rule should target only the `logs/` prefix.
