# my-store-be

Express + TypeScript API backed by **Firestore** (Firebase Admin SDK) and **JWT** auth.

## Prerequisites

- **Node.js** 22+ (matches the [Dockerfile](./Dockerfile) image)
- **npm**
- A **Firebase** project with **Firestore** enabled and a **service account** JSON key (for Admin SDK)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`. You need:

   - `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` — strong random strings for JWT signing.
   - Firestore credentials — **one** of:
     - **`FIREBASE_SERVICE_ACCOUNT_JSON`**: full service account JSON as a **single line** (escape newlines in `private_key` as `\n`), or
     - **`FIREBASE_SERVICE_ACCOUNT_PATH`**: path to a JSON key file, or
     - A file named **`firestore-keys.json`** in the project root (gitignored), loaded automatically if the env vars above are unset.

3. Run the API in watch mode:

   ```bash
   npm run dev
   ```

   Default port is **3000** unless you set `PORT` in `.env`.

4. Useful URLs:

   - `GET /health` — liveness JSON `{ "ok": true }`
   - `GET /docs` — Swagger UI
   - `GET /docs.json` — OpenAPI spec

## Production build (local)

```bash
npm run build
npm start
```

`start` runs `node dist/server.js`.

## Docker

Build and run from the **project root** (where `Dockerfile` and `firestore-keys.json` live). `firestore-keys.json` is gitignored; keep it only on your machine.

```bash
docker build -t my-store-be:local .
docker run --rm -p 8080:8080 \
  -e FIREBASE_SERVICE_ACCOUNT_JSON="$(jq -c . < firestore-keys.json)" \
  -e ACCESS_TOKEN_SECRET="your-secret" \
  -e REFRESH_TOKEN_SECRET="your-secret" \
  my-store-be:local
```

`jq` reads your root-level key file and passes **one-line JSON** into the container (the image does not copy `firestore-keys.json` into the build). Install `jq` if you do not have it (e.g. `brew install jq` on macOS). If your key file lives elsewhere, change the `< …` path.

The container listens on **port 8080** (set in the image via `ENV PORT=8080`).

## Deploy on Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) and sign in:

   ```bash
   fly auth login
   ```

2. In [`fly.toml`](./fly.toml), set **`app`** to your Fly app name (or run `fly launch` from this directory and merge any prompts with the existing file).

3. Create secrets (do **not** commit these; Fly stores them encrypted):

   ```bash
   fly secrets set \
     FIREBASE_SERVICE_ACCOUNT_JSON="$(jq -c . < firestore-keys.json)" \
     ACCESS_TOKEN_SECRET="your-production-secret" \
     REFRESH_TOKEN_SECRET="your-production-secret"
   ```

   Run that from the project root if your key file is `./firestore-keys.json`.

   Adjust the list if you add more required env vars later.

4. Deploy:

   ```bash
   fly deploy
   ```

5. Open the app (HTTPS):

   ```bash
   fly apps open
   ```

   Health check: `https://<your-app>.fly.dev/health` (Fly uses the `/health` check defined in `fly.toml`).

### Fly notes

- [`fly.toml`](./fly.toml) targets a **small** machine (`shared-cpu-1x`, **256MB**) and can **scale to zero** when idle to reduce usage. Billing depends on your Fly org plan; see [Fly billing](https://fly.io/docs/about/billing/).
- Production `PORT` is **8080** in Fly config; do not rely on `.env` on the server—use **`fly secrets set`** for sensitive values.

## Project layout (high level)

- `src/server.ts` — HTTP entrypoint
- `src/routes/` — route wiring
- `src/controllers/` — HTTP layer
- `src/services/` — business logic
- `src/database/` — Firestore init and repositories
# my-store-be
