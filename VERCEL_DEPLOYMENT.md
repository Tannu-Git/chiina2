# Vercel Deployment Guide

This guide explains how to deploy the Logistics OMS application to Vercel.

## Prerequisites

1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a MongoDB Atlas cluster for production database
3. **Cloudinary Account**: For file upload functionality (optional but recommended)

## Deployment Steps

### 1. Database Setup

1. Create a MongoDB Atlas cluster
2. Get your connection string (replace `<username>`, `<password>`, and `<cluster-url>`)
3. Whitelist Vercel's IP addresses in MongoDB Atlas (or use 0.0.0.0/0 for simplicity)

### 2. Environment Variables

Set these environment variables in your Vercel dashboard:

#### Required Variables
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/logistics-oms?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRE=7d
NODE_ENV=production
```

#### Optional Variables (for file uploads)
```
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### Frontend Configuration
```
CLIENT_URL=https://your-app-name.vercel.app
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Import the project
4. Set environment variables in the Vercel dashboard
5. Deploy

### 4. Post-Deployment Setup

1. **Seed Database** (if needed):
   ```bash
   # Run this locally with production MongoDB URI
   cd server
   MONGODB_URI="your-production-uri" npm run seed
   ```

2. **Test the Application**:
   - Visit your Vercel URL
   - Test authentication
   - Verify API endpoints work
   - Check database connections

## Project Configuration Files

### vercel.json
The main configuration file that tells Vercel how to build and route your application.

### .env.production
Template for production environment variables (do not commit actual values).

## Architecture on Vercel

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │  Vercel Edge    │    │  MongoDB Atlas  │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Important Notes

1. **Build Settings**: Vercel will automatically detect the build settings from the configuration
2. **API Routes**: All API routes are handled by the serverless function
3. **CORS**: The application is configured to accept requests from Vercel domains
4. **File Uploads**: Configured to work with Cloudinary for file storage
5. **Rate Limiting**: Production-ready rate limiting is already configured

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your Vercel URL is added to the CORS configuration
2. **Database Connection**: Verify MongoDB URI and network access
3. **Environment Variables**: Double-check all required variables are set
4. **Build Errors**: Check build logs in Vercel dashboard

### Debug Commands
```bash
# Check environment variables
vercel env ls

# View logs
vercel logs

# Check build status
vercel inspect [deployment-url]
```

## Security Considerations

1. **JWT Secret**: Use a strong, unique secret for production
2. **Database Access**: Restrict MongoDB Atlas IP access if possible
3. **HTTPS**: Vercel automatically provides SSL certificates
4. **Rate Limiting**: Already configured for production use

## Monitoring

After deployment, monitor:
- Application performance in Vercel dashboard
- Database metrics in MongoDB Atlas
- Error logs and security violations
- API response times and usage patterns

## Support

For deployment issues:
1. Check Vercel documentation
2. Review MongoDB Atlas connection guides
3. Consult the application logs
4. Test API endpoints individually