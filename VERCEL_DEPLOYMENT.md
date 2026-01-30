# Deploy Frontend to Vercel

## Environment variables

Set these in **Vercel** → your project → **Settings** → **Environment Variables**.

### Required

| Variable        | Description              | Example                          |
|----------------|--------------------------|----------------------------------|
| **VITE_API_URL** | Backend API base URL     | `https://your-server.com/api`   |

- Use the **full API base URL** (including `/api`).
- If the backend is not deployed yet, you can set a placeholder and change it later (each change will trigger a new build).

### Optional

| Variable           | Description   | Example   |
|--------------------|---------------|-----------|
| **VITE_APP_NAME**  | App name      | `SEMS`    |
| **VITE_APP_VERSION** | App version | `1.0.0`   |

These are declared in `vite-env.d.ts` but not used in the app yet. You can omit them.

---

## Vercel project settings

Because the app lives in the `client` folder, use one of these:

**Option A (recommended):** In Vercel → Project Settings → General:
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Option B:** Deploy from repo root and use the included `vercel.json` (it runs install and build inside `client` and uses `client/dist` as output).

---

## Important

- **Vite** bakes `VITE_*` variables into the build at **build time**. So:
  - Add **VITE_API_URL** (and optional vars) in Vercel **before** the first build.
  - After changing any `VITE_*` variable, trigger a **new deployment** (redeploy) so the new values are used.
- **CORS**: Your backend must allow the Vercel frontend origin (e.g. `https://your-app.vercel.app`) in `CLIENT_URL` / CORS config.

---

## Quick checklist

- [ ] Create Vercel project and connect repo.
- [ ] Set **Root Directory** to `client` (or use root with `vercel.json`).
- [ ] Add **VITE_API_URL** = `https://<your-backend>/api`.
- [ ] Deploy; frontend will use that API URL until you change it and redeploy.
