# Client Deployment Guide for Render

This guide will help you deploy your React/Vite client application to Render.

## Prerequisites

1. Your server should already be deployed on Render (you've already done this)
2. Note your server's Render URL (e.g., `https://sems-server.onrender.com`)

## Step-by-Step Deployment

### Option 1: Using Render Dashboard (Recommended for First Time)

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" button
   - Select "Static Site"

2. **Connect Your Repository**
   - Choose your Git provider (GitHub, GitLab, etc.)
   - Select your repository
   - Branch: `main` (or your default branch)

3. **Configure Build Settings**
   - **Name**: `sems-client` (or any name you prefer)
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**
   - Click "Advanced" to add environment variables
   - Add the following:
     ```
     VITE_API_URL = https://YOUR_SERVER_URL.onrender.com/api
     ```
   - Replace `YOUR_SERVER_URL` with your actual server URL from Render
   - Example: If your server URL is `https://sems-server.onrender.com`, then:
     ```
     VITE_API_URL = https://sems-server.onrender.com/api
     ```

5. **Deploy**
   - Click "Create Static Site"
   - Render will automatically build and deploy your client
   - Your client will be available at: `https://sems-client.onrender.com` (or your custom domain)

### Option 2: Using render.yaml File

If you prefer using the `render.yaml` file:

1. **Update render.yaml**
   - Open `render.yaml` in the root directory
   - Update the `VITE_API_URL` value with your actual server URL
   - Example:
     ```yaml
     - key: VITE_API_URL
       value: https://sems-server.onrender.com/api
     ```

2. **Create Static Site Service**
   - Go to Render Dashboard
   - Click "New +" → "Static Site"
   - Connect your repository
   - Render will automatically detect and use `render.yaml`

3. **Deploy**
   - Click "Create Static Site"
   - Render will use the configuration from `render.yaml`

## Important Notes

### Multi-tenant frontend deployment

For tenant app (`client`) use wildcard app domain:
- `*.sems.vpnbeni.com` (tenant client)

For platform admin app (`admin`) use:
- `sems.vpnbeni.com`

Tenant frontend runtime now resolves API host from subdomain, so set:

```bash
VITE_ROOT_APP_DOMAIN=sems.vpnbeni.com
VITE_ROOT_API_DOMAIN=api.vpnbeni.com
VITE_LOCAL_API_URL=http://localhost:5000/api
```

Admin frontend (`/admin`) should point to platform admin API:

```bash
VITE_PLATFORM_API_URL=https://api.vpnbeni.com/api/admin
```

### Environment Variables

Your client uses these environment variables (defined in `client/src/vite-env.d.ts`):
- **VITE_API_URL**: Your backend API URL (REQUIRED)
- **VITE_APP_NAME**: App name (optional)
- **VITE_APP_VERSION**: App version (optional)

### Build Process

1. Render runs: `npm install && npm run build`
2. This creates optimized static files in the `dist/` directory
3. Render serves these static files

### API Configuration

Make sure your `VITE_API_URL`:
- Points to your deployed server URL (not `localhost`)
- Includes the `/api` suffix if your API routes use it
- Uses `https://` (not `http://`)

Example:
- ✅ Correct: `https://sems-server.onrender.com/api`
- ❌ Wrong: `http://localhost:5000/api`
- ❌ Wrong: `https://sems-server.onrender.com` (missing `/api`)

### CORS Configuration

**IMPORTANT:** Your server needs to know your client URL for CORS to work properly.

1. **After deploying your client**, note your client URL (e.g., `https://sems-client.onrender.com`)

2. **Update your server's environment variables** in Render:
   - Go to your server service in Render dashboard
   - Go to "Environment" section
   - Add or update the `CLIENT_URL` variable:
     ```
     CLIENT_URL = https://sems-client.onrender.com
     ```
   - Replace with your actual client URL

3. **Restart your server** after adding the environment variable

This ensures your server's CORS configuration allows requests from your deployed client.

### Testing the Deployment

After deployment:
1. Visit your client URL (e.g., `https://sems-client.onrender.com`)
2. Check browser console for any errors
3. Test API connections by trying to log in or fetch data
4. Verify that API calls are going to the correct server URL

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure Node.js version >= 16.0.0
- Verify all dependencies are in `package.json`

### API Connection Errors
- Verify `VITE_API_URL` is set correctly
- Check server logs to see if requests are arriving
- Ensure CORS is configured on the server
- Check network tab in browser DevTools

### 404 Errors on Routes
- This is normal for SPAs (Single Page Applications)
- Render should handle this automatically with fallback to `index.html`
- If not, add a redirect rule or use Render's SPA routing support

## Custom Domain (Optional)

You can add a custom domain:
1. Go to your static site settings in Render
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

---

**Need Help?**
- Render Docs: https://render.com/docs
- Render Support: support@render.com
