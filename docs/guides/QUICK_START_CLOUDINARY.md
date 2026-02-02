# Quick Start - Cloudinary Integration

## 🚀 Setup (5 minutes)

### Step 1: Get Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up (free account)
3. Note your credentials from dashboard

### Step 2: Configure Server
Add to `server/.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Step 3: Test Connection
```bash
cd server
npm run test:cloudinary
```

You should see: ✅ Cloudinary connection successful!

### Step 4: Start Server
```bash
npm run dev
```

## ✅ That's It!

Your application now:
- ✅ Uploads profile images to Cloudinary
- ✅ Serves images via CDN (fast worldwide)
- ✅ Automatically optimizes images
- ✅ Deletes old images automatically
- ✅ No server storage needed

## 📝 How to Use

1. Open application
2. Go to Students page
3. Click "Edit" on any student
4. Hover over profile picture
5. Click camera icon
6. Select image file
7. Done! Image uploaded to Cloudinary

## 🔍 Verify Upload

Check your Cloudinary dashboard:
- Go to https://cloudinary.com/console
- Navigate to Media Library
- Look for folder: `students/profiles`
- Your uploaded images will be there!

## 🆘 Troubleshooting

**Problem**: Images not uploading
**Solution**: 
1. Check `.env` file has correct credentials
2. Run `npm run test:cloudinary`
3. Check server console for errors

**Problem**: Test script fails
**Solution**:
1. Verify credentials are correct (no extra spaces)
2. Check internet connection
3. Verify Cloudinary account is active

## 📚 More Info

- Full documentation: `CLOUDINARY_INTEGRATION_SUMMARY.md`
- Setup guide: `server/CLOUDINARY_SETUP.md`
- Test script: `server/test-cloudinary.js`

## 🎉 Benefits

- **Fast**: Global CDN delivery
- **Free**: 25GB storage + bandwidth
- **Automatic**: Image optimization
- **Reliable**: 99.99% uptime
- **Easy**: No server maintenance

---

**Need help?** Check the full documentation or Cloudinary support.
