# Vercel Deployment Guide

## Quick Start for 10-15 Users

This guide is optimized for deploying to Vercel with a small user base (10-15 users).

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project**: Your Supabase project should be set up
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

### 1.1 Environment Variables
Create a `.env.local` file (for local testing) with:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ Important**: Never commit `.env.local` to Git. It's already in `.gitignore`.

### 1.2 Verify Build
Test your production build locally:
```bash
npm run build
npm run preview
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your Git repository

2. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

3. **Set Environment Variables**
   - Click "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - Select "Production", "Preview", and "Development" for both

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow prompts
   - Set environment variables when asked

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Supabase

### 3.1 Update CORS Settings
In your Supabase Dashboard:
1. Go to **Settings** → **API**
2. Under **CORS**, add your Vercel domain:
   - `https://your-app.vercel.app`
   - `https://your-custom-domain.com` (if using custom domain)

### 3.2 Verify RLS Policies
Ensure Row Level Security (RLS) is enabled on all tables:
- `shipping_records`
- `users`
- `permissions`
- `role_permissions`
- `user_permissions`
- `container_requirements`
- `packs`
- `data_activity_log`

### 3.3 Run Database Migrations
If not already done, run these SQL scripts in Supabase SQL Editor:
1. `create-permissions-system.sql`
2. `create-container-requirements-system.sql`

## Step 4: Post-Deployment Verification

### 4.1 Test Authentication
- [ ] Login works
- [ ] Logout works
- [ ] Session persists on refresh

### 4.2 Test Permissions
- [ ] Users can only access allowed pages
- [ ] Admin can manage users
- [ ] Role-based permissions work

### 4.3 Test Core Features
- [ ] Dashboard loads data
- [ ] Data view shows records
- [ ] Add/delete records works
- [ ] Filters work correctly
- [ ] Charts render properly

### 4.4 Performance Check
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] Images load correctly

## Step 5: Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Supabase CORS**
   - Add custom domain to Supabase CORS settings

3. **SSL Certificate**
   - Vercel automatically provisions SSL certificates

## Vercel-Specific Optimizations

### Automatic Optimizations
Vercel automatically:
- ✅ CDN distribution (global edge network)
- ✅ Automatic HTTPS
- ✅ Automatic compression (gzip/brotli)
- ✅ Image optimization (if using Vercel Image Optimization)
- ✅ Edge caching for static assets

### Performance for 10-15 Users
With this small user base:
- **No need for**: Complex caching strategies, CDN edge functions, or database connection pooling
- **Focus on**: Fast initial load, efficient queries, proper indexing

### Monitoring
1. **Vercel Analytics** (Optional)
   - Enable in Project Settings → Analytics
   - Free tier available

2. **Error Tracking** (Recommended)
   - Consider integrating Sentry or similar
   - Update `src/lib/logger.ts` to send errors

## Environment Variables in Vercel

### Production
- Set in Vercel Dashboard → Settings → Environment Variables
- Available to all deployments

### Preview
- Same as production
- Used for pull request previews

### Development
- Same as production
- Used for local development with `vercel dev`

## Troubleshooting

### Build Fails
1. Check build logs in Vercel Dashboard
2. Verify all dependencies are in `package.json`
3. Ensure Node.js version is compatible (Vercel uses Node 18.x by default)

### Environment Variables Not Working
1. Verify variables are set in Vercel Dashboard
2. Ensure variable names start with `VITE_`
3. Redeploy after adding variables

### CORS Errors
1. Add Vercel domain to Supabase CORS settings
2. Check Supabase RLS policies

### Slow Performance
1. Check Vercel Analytics for insights
2. Optimize bundle size (already done in `vite.config.ts`)
3. Check Supabase query performance
4. Verify database indexes are in place

## Cost Estimation (10-15 Users)

### Vercel
- **Free Tier**: Perfect for 10-15 users
  - 100GB bandwidth/month
  - Unlimited deployments
  - Automatic HTTPS
  - Global CDN

### Supabase
- **Free Tier**: Sufficient for 10-15 users
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users
  - 2GB file storage

**Total Cost**: $0/month (within free tiers)

## Security Checklist for Vercel

- [x] Environment variables set in Vercel (not in code)
- [x] HTTPS enforced (automatic)
- [x] Security headers configured (`vercel.json`)
- [x] CORS configured in Supabase
- [x] RLS policies enabled
- [x] No console.logs in production (removed in build)
- [x] Error boundaries implemented
- [x] Input validation in place

## Continuous Deployment

### Automatic Deployments
- **Production**: Deploys on push to `main`/`master` branch
- **Preview**: Deploys on pull requests
- **Development**: Deploys on other branches

### Manual Deployments
- Use Vercel CLI: `vercel --prod`
- Or trigger from Vercel Dashboard

## Rollback

If something goes wrong:
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: Available in dashboard
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

## Quick Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Open project in browser
vercel open
```

---

**Ready to deploy?** Follow Step 2 above and you'll be live in minutes! 🚀

