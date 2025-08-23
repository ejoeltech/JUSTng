# JUST App Deployment Guide

## Overview
This guide covers deploying the JUST (Justice Under Surveillance Tech) application to production environments.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/) installed
- [Vercel CLI](https://vercel.com/cli) (for frontend)
- [Supabase](https://supabase.com/) project set up
- Environment variables configured

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to Frontend Directory
```bash
cd frontend
```

### 4. Deploy to Vercel
```bash
vercel --prod
```

### 5. Configure Environment Variables
In Vercel dashboard, go to your project → Settings → Environment Variables and add:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_API_BASE_URL`: Your backend API URL

### 6. Custom Domain (Optional)
In Vercel dashboard → Settings → Domains, add your custom domain.

## Backend Deployment (Render)

### 1. Create Render Account
Visit [render.com](https://render.com) and create an account.

### 2. Connect Repository
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the repository

### 3. Configure Service
- **Name**: `just-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Starter (free tier)

### 4. Set Environment Variables
Add these environment variables:
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.vercel.app
DATABASE_URL=your_supabase_database_url
```

### 5. Deploy
Click "Create Web Service" to deploy.

## Backend Deployment (Railway - Alternative)

### 1. Create Railway Account
Visit [railway.app](https://railway.app) and create an account.

### 2. Connect Repository
- Click "New Project" → "Deploy from GitHub repo"
- Select your repository

### 3. Configure Service
- **Service Type**: Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Set Environment Variables
Add the same environment variables as Render.

### 5. Deploy
Railway will automatically deploy your service.

## Environment Variables Reference

### Frontend (.env.production)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

### Backend (.env.production)
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.vercel.app
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
```

## Post-Deployment Checklist

### Frontend
- [ ] App loads without errors
- [ ] Authentication works
- [ ] API calls succeed
- [ ] Offline functionality works
- [ ] Responsive design on mobile
- [ ] Performance is acceptable

### Backend
- [ ] Health check endpoint responds
- [ ] API routes are accessible
- [ ] Database connections work
- [ ] File uploads function
- [ ] Authentication middleware works
- [ ] CORS is properly configured

### Database
- [ ] Supabase RLS policies are active
- [ ] Tables are created and accessible
- [ ] Storage buckets are configured
- [ ] Row Level Security is working

## Monitoring & Maintenance

### 1. Set Up Logging
- Frontend: Vercel Analytics
- Backend: Render/Railway logs
- Database: Supabase logs

### 2. Performance Monitoring
- Frontend: Vercel Speed Insights
- Backend: Response time monitoring
- Database: Query performance

### 3. Error Tracking
- Frontend: Sentry integration
- Backend: Error logging
- Database: Connection monitoring

## Troubleshooting

### Common Issues

#### Frontend
- **Build Failures**: Check Node.js version and dependencies
- **Environment Variables**: Verify all required vars are set
- **CORS Errors**: Check backend CORS configuration

#### Backend
- **Port Conflicts**: Ensure PORT environment variable is set
- **Database Connection**: Verify Supabase credentials
- **File Uploads**: Check storage bucket permissions

#### Database
- **RLS Policies**: Ensure policies are properly configured
- **Storage**: Verify bucket permissions and policies
- **Connections**: Check connection limits and timeouts

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use strong, unique secrets
- Rotate keys regularly

### 2. CORS Configuration
- Restrict origins to your domains
- Avoid using `*` in production

### 3. Database Security
- Enable RLS on all tables
- Use service role key only on backend
- Regular security audits

### 4. API Security
- JWT tokens are properly validated
- Rate limiting is enabled
- Input validation is active

## Next Steps After Deployment

1. **Testing**: Run end-to-end tests in production
2. **Monitoring**: Set up alerts and monitoring
3. **Backup**: Configure database backups
4. **Documentation**: Update user documentation
5. **Training**: Train admin users
6. **Launch**: Announce to users
7. **Feedback**: Collect and implement user feedback
