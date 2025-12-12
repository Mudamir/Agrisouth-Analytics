# 🚀 Quick Start: Deploy to Vercel in 5 Minutes

## For 10-15 Users - Optimized Setup

### Step 1: Prepare (2 minutes)

1. **Get Supabase Credentials**
   - Go to your Supabase project → Settings → API
   - Copy:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - Anon/Public Key

2. **Verify Local Build Works**
   ```bash
   npm install
   npm run build
   ```
   ✅ Should complete without errors

### Step 2: Deploy to Vercel (3 minutes)

#### Option A: Via Vercel Dashboard (Easiest)

1. **Go to**: [vercel.com/new](https://vercel.com/new)
2. **Import** your Git repository
3. **Configure**:
   - Framework: **Vite** (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add:
     ```
     VITE_SUPABASE_URL = https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY = your-anon-key-here
     ```
   - Select: ✅ Production, ✅ Preview, ✅ Development
5. **Click "Deploy"**
   - Wait ~2-3 minutes
   - ✅ Done!

#### Option B: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables when prompted, or:
# Go to Vercel Dashboard → Settings → Environment Variables

# Deploy to production
vercel --prod
```

### Step 3: Configure Supabase (1 minute)

1. **Add Vercel Domain to CORS**
   - Supabase Dashboard → Settings → API
   - Under "CORS", add:
     - `https://your-app.vercel.app`
     - `https://your-app-*.vercel.app` (for preview deployments)

2. **Verify RLS is Enabled**
   - Supabase Dashboard → Table Editor
   - Check that RLS is enabled on all tables

### Step 4: Test (1 minute)

Visit your Vercel URL:
- ✅ Login works
- ✅ Dashboard loads
- ✅ Data displays correctly

## 🎉 You're Live!

Your app is now deployed and accessible to your 10-15 users.

## 🔧 Troubleshooting

**Build fails?**
- Check Vercel build logs
- Verify environment variables are set
- Ensure `package.json` has all dependencies

**CORS errors?**
- Add Vercel domain to Supabase CORS settings
- Check Supabase RLS policies

**Slow performance?**
- Check Vercel Analytics
- Verify database indexes exist

## 📊 Cost

**Free tier is perfect for 10-15 users:**
- Vercel: Free (100GB bandwidth/month)
- Supabase: Free (500MB database, 2GB bandwidth)

**Total: $0/month** ✅

## 🔐 Security Checklist

- [x] Environment variables set in Vercel
- [x] HTTPS enabled (automatic)
- [x] CORS configured in Supabase
- [x] RLS policies enabled
- [x] Security headers configured

## 📚 Next Steps

- See [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) for detailed guide
- See [SECURITY.md](./SECURITY.md) for security best practices
- Customize domain in Vercel Dashboard → Settings → Domains

---

**Need help?** Check the full [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) guide.


