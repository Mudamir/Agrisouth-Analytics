# Agrisouth Analytics

A modern analytics dashboard for shipping and logistics data management.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/agrisouth-analytics)

### Prerequisites
- Vercel account (free tier is perfect for 10-15 users)
- Supabase project with database set up

### Deployment Steps

1. **Clone and Push to Git**
   ```bash
   git clone <your-repo>
   cd agrisouth-analytics
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Click Deploy

3. **Configure Supabase**
   - Add Vercel domain to Supabase CORS settings
   - Run database migrations (see `create-permissions-system.sql`)

**Full deployment guide**: See [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md)

## 📋 Features

- 📊 **Dashboard**: Real-time analytics and visualizations
- 📦 **Data Management**: Add, edit, and delete shipping records
- 🔐 **Role-Based Access Control**: Flexible permission system
- 👥 **User Management**: Manage users and permissions
- 📈 **Analytics**: Comprehensive data analysis
- 💰 **PNL Tracking**: Profit and loss calculations
- ⚙️ **Configuration**: Customizable settings

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts
- **Deployment**: Vercel

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔐 Security

- Row Level Security (RLS) on all database tables
- Environment variables for sensitive data
- Input validation and sanitization
- Error boundaries for graceful error handling
- Production builds remove console.logs automatically

See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## 📚 Documentation

- [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) - Vercel deployment guide
- [SECURITY.md](./SECURITY.md) - Security best practices
- [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) - Pre-deployment checklist
- [CLEANUP-SUMMARY.md](./CLEANUP-SUMMARY.md) - Codebase cleanup summary

## 🧪 Development

```bash
# Run linter
npm run lint

# Check for console.logs
npm run check:console

# Type checking (via IDE or tsc)
# No separate script needed - TypeScript is configured
```

## 📝 Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🎯 Optimized for Small Teams

This application is optimized for **10-15 users**:
- Simple, efficient architecture
- No complex caching needed
- Direct database queries
- Fast page loads
- Minimal infrastructure costs (free tier on Vercel + Supabase)

## 📄 License

Proprietary - Agrisouth Software

## 🤝 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for Agrisouth**
