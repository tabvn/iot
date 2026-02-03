# Thebaycitydev Cloudflare API

Cloudflare Workers API for Thebaycity IoT platform, using R2 as a single-table store and Durable Objects for per-device state.

## Architecture

- **R2** (`DEVICE_DATA_BUCKET`) used as a single-table store with `PK` and `SK` modeled in object keys under `TABLE_BUCKET_PREFIX`.
- **Durable Objects** (`DeviceDurableObject`) manage per-device in-memory state (last seen + last payload) and append device data into R2.
- **Workers** expose HTTP JSON APIs:
  - `/api/users` – create/get users
  - `/api/workspaces` – workspaces per user
  - `/api/workspaces/:workspaceId/devices` – devices per workspace
  - `/api/login` – basic login/session creation
  - `/api/health` – health check

## Development

```bash
cd api
npm install
npm run dev
```

## Deploy

Ensure you have a Cloudflare account and Wrangler configured, then:

```bash
cd api
npm install
npx wrangler deploy
```

Configure the R2 bucket `thebaycitydev-device-data` and Durable Object namespace `DEVICE_DO` in your Cloudflare dashboard if Wrangler does not create them automatically.
