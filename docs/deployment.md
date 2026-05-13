# Deployment Guide

MomentCap is deployed as a single Docker container via Coolify.

## Prerequisites

- Coolify instance
- GitHub repo: jonny190/momentcap
- A domain configured with Cloudflare tunnel

## Initial Coolify Setup

1. In Coolify, create a new Application
2. Select GitHub as the source and connect the jonny190/momentcap repo
3. Set the branch to main
4. Set the build pack to Dockerfile
5. Configure the following environment variables:

| Variable | Description |
|----------|-------------|
| AUTH_SECRET | Random 32+ character string |
| AUTH_URL | Full public URL, e.g. https://momentcap.daveys.xyz |
| PLATFORM_ADMIN_EMAIL | Your admin email |
| PLATFORM_ADMIN_PASSWORD | Your admin password |
| DATABASE_URL | file:/app/prisma/prod.db |

6. Add two persistent volumes:
   - Source: volume name momentcap-uploads, Destination: /app/uploads
   - Source: volume name momentcap-db, Destination: /app/prisma

7. Set the domain to your domain (HTTP - Cloudflare handles HTTPS)
8. Deploy

## Updating

Push to the main branch. Coolify auto-deploys on push.
