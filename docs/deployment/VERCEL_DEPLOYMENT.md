# Vercel Deployment (Admin + Tenant Client)

Deploy `admin` and `client` as two separate Vercel projects.

## 1. Projects

- Project A: `admin` app
  - Root Directory: `admin`
- Project B: `client` app
  - Root Directory: `client`

Both already include SPA fallback config via:

- `admin/vercel.json`
- `client/vercel.json`

## 2. Environment variables

Assume backend API is on `https://api.example.com`.

### 2.1 Admin project (`admin`)

Set in Vercel project settings:

```env
VITE_PLATFORM_API_URL=https://api.example.com/api/admin
```

### 2.2 Client project (`client`)

Set in Vercel project settings:

```env
VITE_ROOT_APP_DOMAIN=app.example.com
VITE_ROOT_API_DOMAIN=api.example.com
VITE_API_URL=https://api.example.com/api
VITE_LOCAL_API_URL=http://localhost:5000/api
```

## 3. Domain mapping

Recommended:

- `admin.example.com` -> Vercel `admin` project
- `app.example.com` and `*.app.example.com` -> Vercel `client` project
- `api.example.com` -> AWS EC2/Nginx backend

## 4. CORS alignment (backend)

Backend must allow these frontend origins:

```env
CLIENT_URL=https://admin.example.com
CLIENT_URLS=https://admin.example.com,https://app.example.com
ROOT_APP_DOMAIN=app.example.com
ROOT_API_DOMAIN=api.example.com
```

## 5. Build behavior reminder

`VITE_*` variables are baked at build time.
After any env change in Vercel, redeploy that project.
