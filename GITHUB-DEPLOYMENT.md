# 🚀 Deploy to Vercel via GitHub

## Step 1: Push to GitHub

### 1.1 Stage All Changes
```bash
git add .
```

### 1.2 Commit Changes
```bash
git commit -m "feat: Production-ready deployment setup for Vercel

- Added Vercel configuration and optimizations
- Implemented logger utility and error boundaries
- Security improvements and environment variable validation
- Production build optimizations
- Comprehensive deployment documentation"
```

### 1.3 Push to GitHub
```bash
git push origin main
```

## Step 2: Connect Vercel to GitHub

### 2.1 Create Vercel Account (if needed)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account (recommended for easy integration)

### 2.2 Import Project from GitHub
1. **Go to Vercel Dashboard**: [vercel.com/new](https://vercel.com/new)
2. **Click "Import Git Repository"**
3. **Select GitHub** and authorize Vercel (if needed)
4. **Find your repository**: `Mudamir/Agrisouth-Analytics`
5. **Click "Import"**

### 2.3 Configure Project Settings

Vercel will auto-detect Vite settings, but verify:

- **Framework Preset**: `Vite` ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅

### 2.4 Add Environment Variables

**Before clicking "Deploy"**, add environment variables:

1. **Click "Environment Variables"** section
2. **Add these variables**:

   ```
   VITE_SUPABASE_URL
   Value: https://your-project.supabase.co
   ✅ Production
   ✅ Preview
   ✅ Development
   ```

   ```
   VITE_SUPABASE_ANON_KEY
   Value: your-anon-key-here
   ✅ Production
   ✅ Preview
   ✅ Development
   ```

3. **Click "Add"** for each variable

### 2.5 Deploy

1. **Click "Deploy"**
2. **Wait 2-3 minutes** for build to complete
3. **✅ Your app is live!**

## Step 3: Configure Supabase CORS

After deployment, add your Vercel domain to Supabase:

1. **Go to Supabase Dashboard** → **Settings** → **API**
2. **Under "CORS"**, add:
   - `https://your-app.vercel.app`
   - `https://your-app-*.vercel.app` (for preview deployments)
3. **Save**

## Step 4: Verify Deployment

1. **Visit your Vercel URL**: `https://your-app.vercel.app`
2. **Test**:
   - ✅ Login works
   - ✅ Dashboard loads
   - ✅ Data displays correctly
   - ✅ All features work

## Automatic Deployments

Once connected, Vercel will automatically:

- **Deploy to Production**: On every push to `main` branch
- **Create Preview Deployments**: For pull requests
- **Redeploy**: When you push new commits

## Custom Domain (Optional)

1. **Go to**: Vercel Dashboard → Your Project → Settings → Domains
2. **Add your domain**: e.g., `analytics.agrisouth.com`
3. **Follow DNS instructions** from Vercel
4. **Update Supabase CORS** with your custom domain

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Verify environment variables are set
- Ensure all dependencies are in `package.json`

### CORS Errors
- Add Vercel domain to Supabase CORS settings
- Check Supabase RLS policies

### Environment Variables Not Working
- Verify variables start with `VITE_`
- Redeploy after adding variables
- Check variable names match exactly

## Quick Commands

```bash
# Push changes (triggers auto-deploy)
git add .
git commit -m "Your commit message"
git push origin main

# View deployment status
# Go to Vercel Dashboard → Deployments
```

## Next Steps

- ✅ Monitor deployments in Vercel Dashboard
- ✅ Set up custom domain (optional)
- ✅ Enable Vercel Analytics (optional)
- ✅ Configure error tracking (optional)

---

**Your app will be live in minutes!** 🎉


