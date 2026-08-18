import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Ship,
  BarChart3,
  Package,
  TrendingUp,
  Globe,
} from 'lucide-react';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/lib/auth';
import { cn } from '@/lib/utils';

const HIGHLIGHTS = [
  {
    badge: 'Shipping Operations',
    icon: Ship,
    title: 'Live Shipment Tracking',
    body: 'Monitor containers, vessels, destinations, and billing in one operational view.',
  },
  {
    badge: 'Volume Insights',
    icon: BarChart3,
    title: 'Pack & Load Analytics',
    body: 'Compare carton volumes and pack mix across weeks, suppliers, and trade lanes.',
  },
  {
    badge: 'Financial Analytics',
    icon: TrendingUp,
    title: 'P&L Intelligence',
    body: 'Connect purchase, sales, and profit by pack type so every shipment stays accountable.',
  },
  {
    badge: 'Data Management',
    icon: Package,
    title: 'Container Control',
    body: 'Lock containers, add pack entries, and keep shipping records accurate from origin to arrival.',
  },
  {
    badge: 'Executive Overview',
    icon: Globe,
    title: 'Business Intelligence',
    body: 'Advanced analytics and insights for Agrisouth agricultural shipping operations.',
  },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.location.pathname === '/login') {
        localStorage.removeItem('isLoggingOut');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isLoggingOut = localStorage.getItem('isLoggingOut') === 'true';

    if (isLoggingOut) {
      return;
    }

    const timer = setTimeout(() => {
      const stillLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
      if (!stillLoggingOut && isAuthenticated) {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((current) => (current + 1) % HIGHLIGHTS.length);
    }, 5200);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      localStorage.removeItem('isLoggingOut');

      const result = await login({ email, password });

      if (result.success) {
        localStorage.removeItem('isLoggingOut');
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const highlight = HIGHLIGHTS[activeSlide];
  const HighlightIcon = highlight.icon;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1D36] font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(15,60,110,0.55),_transparent_50%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="flex w-full max-w-[1080px] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_-24px_rgba(5,16,36,0.65)]">
          {/* Left — form */}
          <div className="flex w-full flex-col justify-between bg-white px-8 py-10 sm:px-12 sm:py-12 lg:w-1/2 lg:px-14 lg:py-14">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                  <img src={logoImage} alt="AGSouth" className="h-full w-full object-contain p-1" />
                </div>
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold text-slate-800">Agrisouth (Jersey) Ltd.</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Pacific Branch Office
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h1 className="font-heading text-[32px] font-bold tracking-tight text-slate-900">
                  Welcome Back!
                </h1>
                <p className="mt-2 text-[15px] text-slate-400">
                  Sign in to your Agrisouth Analytics account
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        'h-12 rounded-lg border-slate-200 bg-slate-50 pl-11 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1B4F8A] focus-visible:ring-[#1B4F8A]/20',
                        emailError && 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20'
                      )}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-lg border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[#1B4F8A] focus-visible:ring-[#1B4F8A]/20"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-12 w-full rounded-lg bg-[#123A63] text-[15px] font-semibold text-white shadow-none hover:bg-[#0E2F52]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    'Log In'
                  )}
                </Button>
              </form>
            </div>

            <p className="mt-10 text-center text-[11px] text-slate-400">
              © 2026 Agrisouth (Jersey) Ltd. • Authorized access only
            </p>
          </div>

          {/* Right — branded panel */}
          <div className="relative hidden overflow-hidden bg-[#123A63] lg:flex lg:w-1/2">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(125,211,252,0.12),transparent_32%)]" />

            <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
              <defs>
                <pattern id="login-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="1.4" cy="1.4" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#login-dots)" />
              <circle cx="72" cy="88%" r="150" fill="none" stroke="white" strokeWidth="1" />
              <circle cx="72" cy="88%" r="210" fill="none" stroke="white" strokeWidth="1" />
              <circle cx="92%" cy="48" r="120" fill="none" stroke="white" strokeWidth="1" />
              <circle cx="92%" cy="48" r="176" fill="none" stroke="white" strokeWidth="1" />
              <rect x="18%" y="18%" width="18" height="18" fill="none" stroke="white" strokeWidth="1" />
              <rect x="76%" y="72%" width="22" height="22" fill="none" stroke="white" strokeWidth="1" />
            </svg>

            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-12 text-center text-white">
              <div className="mb-8 flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(5,16,36,0.35)]">
                <img src={logoImage} alt="AGSouth" className="h-full w-full object-contain p-3" />
              </div>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200/20 bg-sky-300/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                <HighlightIcon className="h-3.5 w-3.5" />
                {highlight.badge}
              </div>

              <h2 className="max-w-sm font-heading text-[28px] font-bold leading-tight tracking-tight">
                {highlight.title}
              </h2>
              <p className="mt-4 max-w-[340px] text-[15px] leading-relaxed text-white/75">
                {highlight.body}
              </p>

              <div className="mt-10 flex items-center gap-2">
                {HIGHLIGHTS.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Show ${item.title}`}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      index === activeSlide
                        ? 'w-8 bg-sky-300'
                        : 'w-2 bg-white/30 hover:bg-white/50'
                    )}
                  />
                ))}
              </div>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                Shipping System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
