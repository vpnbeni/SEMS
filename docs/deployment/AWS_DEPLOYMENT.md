# AWS Deployment Guide for SEMS Server

This guide covers deploying your Node.js Express server to AWS. We'll cover multiple deployment options, with **AWS Elastic Beanstalk** being the recommended approach for simplicity.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Option 1: AWS Elastic Beanstalk (Recommended)](#option-1-aws-elastic-beanstalk-recommended)
3. [Option 2: AWS EC2](#option-2-aws-ec2)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ AWS Account (sign up at [aws.amazon.com](https://aws.amazon.com))
- ✅ AWS CLI installed and configured (`aws configure`)
- ✅ EB CLI installed (for Elastic Beanstalk) or SSH access (for EC2)
- ✅ MongoDB Atlas account (or AWS DocumentDB)
- ✅ Cloudinary account (for image uploads)
- ✅ Git repository ready

---

## Option 1: AWS Elastic Beanstalk (Recommended)

Elastic Beanstalk is the easiest way to deploy Node.js applications to AWS. It handles load balancing, auto-scaling, and monitoring automatically.

### Step 1: Install EB CLI

```bash
# macOS
brew install awsebcli

# Or using pip
pip install awsebcli --upgrade --user
```

### Step 2: Initialize Elastic Beanstalk

Navigate to your server directory:

```bash
cd server
eb init
```

Follow the prompts:
- **Select a region**: Choose closest to your users (e.g., `us-east-1`)
- **Application name**: `sems-server` (or your preferred name)
- **Platform**: Select `Node.js`
- **Node.js version**: Select `18.x` or `20.x` (matches your package.json)
- **SSH**: Choose `Yes` if you want SSH access
- **SSH keypair**: Select or create a new keypair

### Step 3: Create Environment Configuration File

Create `.ebextensions/nodecommand.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
```

### Step 4: Create Environment File

Create `.ebextensions/environment.config` to set environment variables (or use EB Console):

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
    # Add other environment variables here
    # Note: Sensitive values should be set via EB Console, not in config files
```

**⚠️ Important**: Don't commit sensitive values (JWT_SECRET, MongoDB URI, etc.) in config files. Set them via EB Console.

### Step 5: Create Application Version

```bash
# From the server directory
eb create sems-server-prod
```

This will:
- Create an EC2 instance
- Set up load balancer
- Configure security groups
- Deploy your application

### Step 6: Set Environment Variables

Go to AWS Elastic Beanstalk Console:
1. Select your environment
2. Go to **Configuration** → **Software** → **Environment properties**
3. Add all required environment variables (see [Environment Variables Setup](#environment-variables-setup))

### Step 7: Deploy Updates

```bash
# Deploy changes
eb deploy

# Check status
eb status

# View logs
eb logs

# Open in browser
eb open
```

### Step 8: Configure Custom Domain (Optional)

```bash
eb setenv CUSTOM_DOMAIN=api.yourdomain.com
# Then configure DNS in Route 53 or your DNS provider
```

---

## Option 2: AWS EC2

For more control over the server environment, deploy directly to EC2.

### Step 1: Launch EC2 Instance

1. Go to **EC2 Console** → **Launch Instance**
2. **Name**: `sems-server`
3. **AMI**: Amazon Linux 2023 or Ubuntu 22.04 LTS
4. **Instance Type**: `t3.micro` (free tier) or `t3.small` (recommended)
5. **Key Pair**: Create or select existing
6. **Network Settings**: 
   - Create security group
   - Allow HTTP (80), HTTPS (443), and SSH (22)
   - Allow custom TCP port 5000 (or your PORT)
7. **Launch Instance**

### Step 2: Connect to Instance

```bash
# Replace with your key file and instance IP
ssh -i your-key.pem ec2-user@your-instance-ip
# For Ubuntu: ssh -i your-key.pem ubuntu@your-instance-ip
```

### Step 3: Install Node.js

**For Amazon Linux 2023:**
```bash
# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

**For Ubuntu:**
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 5: Clone and Setup Application

```bash
# Install Git
sudo yum install git -y  # Amazon Linux
# or
sudo apt-get install git -y  # Ubuntu

# Clone repository
cd /home/ec2-user  # or /home/ubuntu
git clone https://github.com/your-username/SEMS.git
cd SEMS/server

# Install dependencies
npm install --production
```

### Step 6: Create Environment File

```bash
# Create .env file
nano .env
```

Add all environment variables (see [Environment Variables Setup](#environment-variables-setup))

### Step 7: Configure PM2

Create `ecosystem.config.js` in server directory:

```javascript
module.exports = {
  apps: [{
    name: 'sems-server',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### Step 8: Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually involves sudo)
```

### Step 9: Configure Nginx (Reverse Proxy)

Install Nginx:
```bash
# Amazon Linux
sudo yum install nginx -y

# Ubuntu
sudo apt-get install nginx -y
```

Create Nginx configuration `/etc/nginx/conf.d/sems.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 10: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y  # Amazon Linux
# or
sudo apt-get install certbot python3-certbot-nginx -y  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

---

## Environment Variables Setup

Set these environment variables in your deployment platform:

### Multi-tenant required variables

```bash
MONGODB_URI=...
CENTRAL_DB_NAME=sems_central
TENANT_DB_PREFIX=sems_tenant_
ROOT_APP_DOMAIN=sems.vpnbeni.com
ROOT_API_DOMAIN=api.vpnbeni.com

PLATFORM_JWT_SECRET=...
PLATFORM_JWT_EXPIRE=1d
PLATFORM_ADMIN_EMAIL=admin@platform.com
PLATFORM_ADMIN_PASSWORD=change_me
```

Run the bootstrap once after deploy:

```bash
cd server
npm run bootstrap:platform
```

DNS/TLS must cover wildcard tenant hosts:
- `api.vpnbeni.com`
- `*.api.vpnbeni.com`
- `sems.vpnbeni.com`
- `*.sems.vpnbeni.com`

### Required Variables

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/examination_management_system?retryWrites=true&w=majority
DB_NAME=examination_management_system

# Server
NODE_ENV=production
PORT=5000  # Or 8080 for Elastic Beanstalk

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key
JWT_REFRESH_EXPIRE=30d

# Frontend URL (update with your deployed frontend URL)
CLIENT_URL=https://your-frontend-domain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Optional Variables

```bash
# Email (if using email features)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Security
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=10485760
FILE_UPLOAD_PATH=./uploads
```

### Setting Variables

**Elastic Beanstalk:**
```bash
eb setenv MONGODB_URI="your-uri" JWT_SECRET="your-secret" CLIENT_URL="https://your-frontend.com"
```

**EC2 (PM2):**
Update `ecosystem.config.js` or use `.env` file

---

## Post-Deployment Checklist

- [ ] Verify server is running: `curl http://your-server-url/health`
- [ ] Test API endpoints
- [ ] Verify MongoDB connection
- [ ] Test file uploads (Cloudinary)
- [ ] Update frontend `VITE_API_URL` to point to new server
- [ ] Test authentication flow
- [ ] Monitor logs for errors
- [ ] Setup CloudWatch alarms (Elastic Beanstalk) or PM2 monitoring (EC2)
- [ ] Configure backup strategy for MongoDB
- [ ] Setup domain and SSL certificate
- [ ] Test CORS configuration with frontend

---

## Troubleshooting

### Common Issues

#### 1. Application Not Starting

**Check logs:**
```bash
# Elastic Beanstalk
eb logs

# EC2 with PM2
pm2 logs sems-server
```

**Common causes:**
- Missing environment variables
- MongoDB connection issues
- Port conflicts

#### 2. MongoDB Connection Failed

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (add EC2 IP or `0.0.0.0/0` for testing)
- Verify network security groups allow outbound connections

#### 3. CORS Errors

Update `CLIENT_URL` environment variable to match your frontend URL exactly (including protocol and port if applicable).

#### 4. File Upload Issues

- Verify Cloudinary credentials
- Check file size limits
- Ensure temp directory has write permissions

#### 5. High Memory Usage

- Monitor with CloudWatch (EB) or `pm2 monit` (EC2)
- Consider upgrading instance type
- Optimize application code

### Useful Commands

**Elastic Beanstalk:**
```bash
eb status          # Check environment status
eb logs            # View logs
eb health          # Check health
eb ssh             # SSH into instance
eb terminate       # Delete environment
```

**EC2 with PM2:**
```bash
pm2 status         # Check status
pm2 logs           # View logs
pm2 restart all    # Restart application
pm2 monit          # Monitor resources
pm2 stop all       # Stop application
```

---

## Cost Estimation

### Elastic Beanstalk
- **Free Tier**: 750 hours/month of t2.micro/t3.micro for 12 months
- **After Free Tier**: ~$15-30/month (t3.small instance)

### EC2
- **Free Tier**: 750 hours/month of t2.micro/t3.micro for 12 months
- **After Free Tier**: ~$10-20/month (t3.micro) or ~$15-30/month (t3.small)

**Additional Costs:**
- MongoDB Atlas: Free tier available (512MB), paid plans start at ~$9/month
- Cloudinary: Free tier available (25GB storage, 25GB bandwidth)
- Domain: ~$10-15/year
- SSL Certificate: Free with Let's Encrypt

---

## Next Steps

1. **Set up CI/CD**: Use GitHub Actions or AWS CodePipeline for automated deployments
2. **Monitoring**: Configure CloudWatch or use services like Datadog, New Relic
3. **Backup**: Set up automated MongoDB backups
4. **Scaling**: Configure auto-scaling for high traffic
5. **CDN**: Use CloudFront for static assets
6. **Load Balancing**: Already included in Elastic Beanstalk

---

## Support

For issues specific to AWS deployment:
- AWS Documentation: [docs.aws.amazon.com](https://docs.aws.amazon.com)
- Elastic Beanstalk: [AWS EB Docs](https://docs.aws.amazon.com/elasticbeanstalk/)
- EC2: [AWS EC2 Docs](https://docs.aws.amazon.com/ec2/)

For application-specific issues, refer to the main README.md or create an issue in the repository.
