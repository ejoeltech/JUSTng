# 🚀 JUST App Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables
- [ ] Create Supabase project
- [ ] Get Supabase URL and API keys
- [ ] Generate secure JWT secret
- [ ] Set CORS origin to your frontend domain

### 2. Repository Setup
- [ ] Push code to GitHub
- [ ] Set up GitHub repository secrets (if using CI/CD)

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy Frontend
```bash
cd frontend
vercel --prod
```

### 3. Configure Environment Variables in Vercel
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

## Backend Deployment (Render)

### 1. Create Render Account
- Visit [render.com](https://render.com)
- Sign up with GitHub

### 2. Deploy Backend
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Configure:
  - **Name**: `just-backend`
  - **Environment**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`

### 3. Set Environment Variables in Render
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

## Alternative Backend Deployment (Railway)

### 1. Create Railway Account
- Visit [railway.app](https://railway.app)
- Sign up with GitHub

### 2. Deploy Backend
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your repository
- Set environment variables (same as Render)

## Post-Deployment Verification

### 1. Health Checks
- [ ] Frontend loads without errors
- [ ] Backend health endpoint responds: `https://your-backend.onrender.com/health`
- [ ] Database connection works
- [ ] Authentication flows work

### 2. Functionality Tests
- [ ] User registration/login
- [ ] Incident reporting
- [ ] File uploads
- [ ] Offline queue system
- [ ] Admin dashboard access
- [ ] Map functionality

### 3. Performance & Security
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] JWT authentication works

## Monitoring Setup

### 1. Logs
- [ ] Vercel Analytics (frontend)
- [ ] Render/Railway logs (backend)
- [ ] Supabase logs (database)

### 2. Alerts
- [ ] Set up error monitoring
- [ ] Configure performance alerts
- [ ] Set up uptime monitoring

## Quick Commands

### Deploy Everything (PowerShell)
```powershell
.\deploy.ps1
```

### Deploy Everything (Bash)
```bash
./deploy.sh
```

### Manual Frontend Deploy
```bash
cd frontend
npm run build
vercel --prod
```

### Manual Backend Deploy
```bash
cd backend
npm install
npm start
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check CORS_ORIGIN in backend
2. **Database Connection**: Verify Supabase credentials
3. **Build Failures**: Check Node.js version (18+)
4. **Environment Variables**: Ensure all required vars are set

### Support Resources
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)

## Next Steps After Deployment

1. **Testing**: Run end-to-end tests
2. **Monitoring**: Set up alerts and monitoring
3. **Backup**: Configure database backups
4. **Documentation**: Update user documentation
5. **Training**: Train admin users
6. **Launch**: Announce to users
7. **Feedback**: Collect and implement user feedback

---

**Status**: Ready for Production Deployment! 🎉

Your JUST application is now fully configured for deployment. Follow this checklist step by step to get your app live.
