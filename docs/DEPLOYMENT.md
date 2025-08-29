# JUST Application Deployment Guide

This guide covers deploying the JUST application to production environments.

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- Supabase project created
- Vercel account (for frontend)
- Render/Railway account (for backend)

## 1. Supabase Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down your project URL and API keys

### Database Setup
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `docs/database-schema.sql`
3. Execute the script to create all tables and policies

### Storage Setup
1. Go to Storage in your Supabase dashboard
2. Create buckets:
   - `incident-photos` (for incident photos)
   - `incident-videos` (for incident videos)
   - `user-avatars` (for user profile pictures)
3. Set appropriate RLS policies for each bucket

### Authentication Setup
1. Go to Authentication > Settings
2. Configure your site URL and redirect URLs
3. Enable email confirmations if needed
4. Set up any additional auth providers (Google, etc.)

## 2. Frontend Deployment (Vercel)

### Prepare Frontend
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Create `.env` file from template:
   ```bash
   cp env.example .env
   ```

3. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_BASE_URL=https://your-backend-url.com/api
   ```

4. Build the application:
   ```bash
   npm run build
   ```

### Deploy to Vercel
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add all variables from your `.env` file

## 3. Backend Deployment (Render)

### Prepare Backend
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create `.env` file from template:
   ```bash
   cp env.example .env
   ```

3. Fill in your credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_secure_jwt_secret
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

### Deploy to Render
1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Configure:
   - **Name**: just-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

6. Add environment variables in Render dashboard
7. Deploy

## 4. Backend Deployment (Railway Alternative)

### Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repository
4. Add environment variables
5. Deploy

## 5. Domain & SSL Setup

### Custom Domain (Optional)
1. In Vercel: Add custom domain in project settings
2. In Render/Railway: Add custom domain in service settings
3. Update DNS records with your domain provider

### SSL Certificates
- Vercel: Automatic SSL
- Render: Automatic SSL
- Railway: Automatic SSL

## 6. Environment Variables Checklist

### Frontend (.env)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_API_BASE_URL`
- [ ] `VITE_APP_NAME`
- [ ] `VITE_APP_VERSION`

### Backend (.env)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRES_IN`
- [ ] `FRONTEND_URL`
- [ ] `NODE_ENV`
- [ ] `PORT`

## 7. Post-Deployment Verification

### Health Checks
1. Frontend: Visit your Vercel URL
2. Backend: Visit `https://your-backend-url.com/health`

### Test Core Features
1. User registration
2. User login
3. Incident reporting
4. Map functionality
5. Admin features (if applicable)

### Performance Testing
1. Use tools like Lighthouse for frontend
2. Test API response times
3. Check database query performance

## 8. Monitoring & Maintenance

### Logs
- Vercel: Built-in logging
- Render: Logs tab in dashboard
- Railway: Logs tab in dashboard

### Error Tracking
- Consider adding Sentry for error monitoring
- Set up alerts for critical errors

### Database Monitoring
- Use Supabase dashboard for database insights
- Monitor query performance
- Set up alerts for storage usage

## 9. Security Checklist

- [ ] Environment variables are secure
- [ ] JWT secret is strong and unique
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] File upload limits are set
- [ ] HTTPS is enforced
- [ ] RLS policies are active

## 10. Backup Strategy

### Database Backups
- Supabase provides automatic backups
- Consider setting up additional backup solutions

### Code Backups
- GitHub provides version control
- Consider setting up automated deployments

## Troubleshooting

### Common Issues
1. **CORS errors**: Check FRONTEND_URL in backend environment
2. **Database connection**: Verify Supabase credentials
3. **Build failures**: Check Node.js version compatibility
4. **Environment variables**: Ensure all required vars are set

### Support
- Check application logs
- Verify environment variables
- Test locally first
- Check Supabase dashboard for database issues

## Production Considerations

### Scaling
- Consider upgrading to paid plans for better performance
- Implement caching strategies
- Use CDN for static assets

### Security
- Regular security audits
- Keep dependencies updated
- Monitor for suspicious activity

### Performance
- Implement database indexing
- Use connection pooling
- Optimize image/video processing

---

**Remember**: Always test thoroughly in staging before deploying to production!
