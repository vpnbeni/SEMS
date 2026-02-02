# Cloudinary Setup Guide

This application uses Cloudinary for storing and managing student profile images.

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. After signing up, you'll be redirected to your dashboard

### 2. Get Your Cloudinary Credentials

From your Cloudinary dashboard, you'll find:
- **Cloud Name**: Your unique cloud name
- **API Key**: Your API key
- **API Secret**: Your API secret (click the eye icon to reveal it)

### 3. Configure Environment Variables

Add the following variables to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Replace the values with your actual Cloudinary credentials.

### 4. Folder Structure

Profile images are automatically organized in Cloudinary:
- **Folder**: `students/profiles`
- **Naming**: `student_{rollNumber}_{timestamp}`

### 5. Image Transformations

Images are automatically optimized with:
- **Max dimensions**: 500x500 pixels
- **Quality**: Auto (Cloudinary optimizes based on content)
- **Format**: Auto (Cloudinary serves the best format for the browser)

## Features

### Upload
- Profile images are uploaded to Cloudinary when a student's profile is updated
- Old images are automatically deleted when a new image is uploaded
- Supports JPEG, PNG, GIF, and WebP formats
- Maximum file size: 5MB

### Delete
- Profile images are automatically deleted from Cloudinary when:
  - A student is deleted
  - A new profile image is uploaded (old one is removed)

### URL Management
- Cloudinary URLs are stored in the database
- URLs are permanent and can be accessed directly
- Images are served via Cloudinary's CDN for fast loading

## Testing

To test the Cloudinary integration:

1. Start the server: `npm run dev`
2. Open the application and edit a student
3. Upload a profile image
4. Check your Cloudinary dashboard to see the uploaded image in `students/profiles` folder

## Troubleshooting

### Images not uploading
- Verify your Cloudinary credentials in `.env`
- Check server logs for error messages
- Ensure the file size is under 5MB
- Verify the file format is supported (JPEG, PNG, GIF, WebP)

### Old images not deleting
- Check server logs for deletion errors
- Verify the Cloudinary API secret is correct
- Ensure the public_id extraction is working correctly

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 transformations per month

This should be sufficient for most educational institutions. Monitor your usage in the Cloudinary dashboard.

## Security Notes

- Never commit your `.env` file to version control
- Keep your API secret secure
- Use environment variables for all sensitive data
- Consider using signed URLs for additional security in production
