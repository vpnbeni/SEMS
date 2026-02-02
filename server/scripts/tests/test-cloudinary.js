require('dotenv').config();
const { cloudinary } = require('./src/config/cloudinary');

/**
 * Test Cloudinary configuration
 * Run this script to verify your Cloudinary credentials are correct
 */
async function testCloudinaryConnection() {
  console.log('Testing Cloudinary connection...\n');

  // Check if environment variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('❌ CLOUDINARY_CLOUD_NAME is not set in .env file');
    return;
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    console.error('❌ CLOUDINARY_API_KEY is not set in .env file');
    return;
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ CLOUDINARY_API_SECRET is not set in .env file');
    return;
  }

  console.log('✓ Environment variables are set');
  console.log(`  Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`  API Key: ${process.env.CLOUDINARY_API_KEY.substring(0, 5)}...`);
  console.log(`  API Secret: ${process.env.CLOUDINARY_API_SECRET.substring(0, 5)}...\n`);

  try {
    // Test API connection by fetching account details
    const result = await cloudinary.api.ping();
    
    if (result.status === 'ok') {
      console.log('✅ Cloudinary connection successful!');
      console.log('   Your Cloudinary account is properly configured.\n');
      
      // Get usage information
      try {
        const usage = await cloudinary.api.usage();
        console.log('📊 Account Usage:');
        console.log(`   Storage: ${(usage.storage.usage / 1024 / 1024).toFixed(2)} MB / ${(usage.storage.limit / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Bandwidth: ${(usage.bandwidth.usage / 1024 / 1024).toFixed(2)} MB / ${(usage.bandwidth.limit / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Transformations: ${usage.transformations.usage} / ${usage.transformations.limit}`);
      } catch (usageError) {
        console.log('ℹ️  Could not fetch usage information (this is normal for some account types)');
      }
    } else {
      console.error('❌ Cloudinary connection failed');
      console.error('   Status:', result.status);
    }
  } catch (error) {
    console.error('❌ Cloudinary connection failed');
    console.error('   Error:', error.message);
    
    if (error.http_code === 401) {
      console.error('\n   This usually means your API credentials are incorrect.');
      console.error('   Please verify your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file.');
    }
  }
}

// Run the test
testCloudinaryConnection()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
