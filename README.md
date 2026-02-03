# The Bay City Dev Monorepo

This repository contains:

- `api/` – Cloudflare Workers backend for IoT workspaces, devices, automations, analytics, and auth.
- `web/` – Next.js (App Router) frontend for the IoT dashboard and public site.

## Quick Start

### Backend (Cloudflare Worker)

```bash
cd api
npm install
npm run dev
```

This starts the worker locally (by default on `http://localhost:8787`).

- Swagger UI: http://localhost:8787/api/docs
- OpenAPI JSON: http://localhost:8787/api/openapi.json

### Frontend (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local   # adjust API URL if needed
npm run dev
```

By default the web app expects the backend at `NEXT_PUBLIC_API_BASE_URL` (see `.env.local`).

Visit http://localhost:3000 to use the app.

## Auth Flow

- **Signup**: `web` calls `POST /api/users` then `POST /api/login` to obtain a JWT and session.
- **Login**: `web` calls `POST /api/login` and stores `token`, `sessionId`, and minimal user info in `localStorage`.
- **Logout**: `web` calls `POST /api/logout` with Bearer token and clears local state.

The worker validates JWTs for multiple roles (user, api, device, workspace_master, super_master) and routes requests accordingly.
