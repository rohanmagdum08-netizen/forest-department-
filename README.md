# ForestGuard 360

Forest operations dashboard and reporting API built with React, Tailwind CSS, Node.js, Express, PostgreSQL, and Cloudinary.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer, locally or hosted
- A Cloudinary account for report photos

## Configure

```powershell
Copy-Item .env.example .env
```

Create a PostgreSQL database named `forestguard360`, then set `DATABASE_URL` in `.env`. Set a long unique `SESSION_SECRET`, and add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from your Cloudinary dashboard. Choose an administrator email and a password of at least 12 characters in `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

```powershell
npm install
npm run db:setup
npm run db:seed-admin
npm run build
npm start
```

Open http://localhost:8000 and sign in with the administrator credentials you set in `.env`. The Vite development frontend can also be run in a second terminal with `npm --prefix frontend install` and `npm --prefix frontend run dev` (http://127.0.0.1:5173).

## Images

Report images are uploaded directly from the browser to Cloudinary using a short-lived server signature. The API secret stays on the Node.js server. PostgreSQL stores the Cloudinary secure URL and public ID. Uploads are optional; without Cloudinary credentials, the rest of the app can run, and image uploads show a configuration message.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET /api/admin/overview` — staff dashboard overview
- `GET/POST /api/fires` and `GET/POST /api/conflicts`
- `POST /api/cloudinary/signature` — authenticated signed image upload parameters
- `GET /api/health`

## Database

The schema is in `server/schema.sql`; run `npm run db:setup` after creating the database. PostgreSQL stores users, fire and conflict reports, patrols, animal records, rescue cases, plantation projects, destinations, and bookings. Set `PGSSL=true` for hosted PostgreSQL providers that require TLS.

## Project layout

```text
server/              Express API, PostgreSQL setup, and admin seed command
frontend/src/        React and Tailwind admin UI and Cloudinary upload helper
static/core/images/  Local forest illustrations and icons
static/frontend/     Built React assets served by Express
```
