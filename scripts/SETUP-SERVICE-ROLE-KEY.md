# Setting Up Service Role Key for Bulk Updates

## Why You Need This

The **Service Role Key** bypasses Row Level Security (RLS) policies, which is required for bulk update operations like importing invoice data.

**Without it**: Updates appear to succeed but are silently blocked by RLS policies.

**With it**: Updates actually happen and data is visible in the database.

## Quick Setup (3 Steps)

### Step 1: Get Your Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Find the **`service_role`** key (NOT the `anon` key)
6. Click the **eye icon** to reveal it
7. **Copy the key** (it's long, make sure you get it all)

⚠️ **Security Warning**: The service role key has full database access. Never expose it in client-side code or commit it to public repositories.

### Step 2: Add to Your .env File

Open your `.env.local` file (or create it if it doesn't exist) and add:

```bash
# Your existing Supabase URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Add this line with your service role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1yZWYiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.your-actual-key-here
```

**Important**: 
- Replace `your-actual-key-here` with the actual service role key you copied
- The key starts with `eyJ...` and is very long
- Don't add quotes around the key value

### Step 3: Verify It Works

Run the test script:

```bash
npm run test:rls
```

You should see:
```
✅ Update successful (returned data)
✅ SERVICE_ROLE_KEY is configured - updates should work
```

## File Locations

Your `.env.local` file should be in the project root:
```
Agrisouth-Analytics/
  ├── .env.local          ← Add the key here
  ├── .env                ← Or here (but .env.local takes priority)
  ├── package.json
  └── ...
```

## Security Best Practices

✅ **DO:**
- Store the key in `.env.local` (already in `.gitignore`)
- Use it only in server-side scripts
- Keep it secret and secure

❌ **DON'T:**
- Commit it to Git (`.env.local` should be in `.gitignore`)
- Use it in client-side code (React components, etc.)
- Share it publicly or in screenshots
- Use it for regular user operations (use `anon` key instead)

## Troubleshooting

### "Missing Supabase credentials" error
- Make sure `.env.local` exists in the project root
- Check that `SUPABASE_SERVICE_ROLE_KEY=` is on its own line
- Restart your terminal/IDE after adding the key

### Still getting RLS errors
- Verify you copied the **service_role** key, not the **anon** key
- Check for extra spaces or quotes around the key
- Make sure the key is complete (they're very long)

### Key not working
- Try copying the key again (they're long and easy to miss characters)
- Check for hidden characters or line breaks
- Verify the key starts with `eyJ` (JWT format)

## After Setup

Once configured, you can run:

```bash
# Test RLS access
npm run test:rls

# Run optimized upsert
npm run upsert:invoice:optimized

# Verify updates
npm run verify:invoice
```

All scripts will automatically use the service role key if available, falling back to anon key with warnings.

