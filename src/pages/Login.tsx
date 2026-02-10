import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/dashboard/Logo';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield } from 'lucide-react';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/lib/auth';
import { cn } from '@/lib/utils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, logout } = useAuth();
  
  // Clear logout flag when component mounts (user is on login page)
  useEffect(() => {
    // Small delay to ensure logout completed
    const timer = setTimeout(() => {
      // Only clear if we're still on login page (user didn't navigate away)
      if (window.location.pathname === '/login') {
        localStorage.removeItem('isLoggingOut');
      }
    }, 3000); // Wait 3 seconds to ensure logout is complete
    
    return () => clearTimeout(timer);
  }, []);

  // Redirect if already authenticated (but not if we just logged out)
  useEffect(() => {
    // Check if we're in the middle of a logout
    const isLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
    
    // If we're logging out, don't redirect - stay on login page
    if (isLoggingOut) {
      return;
    }
    
    // Only redirect if authenticated and not logging out
    // Use a longer delay to ensure logout state is fully cleared
    const timer = setTimeout(() => {
      // Triple-check we're not logging out
      const stillLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
      if (!stillLoggingOut && isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }, 500); // Longer delay to ensure logout completes
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate, location]);

  // Validate email on change
  useEffect(() => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // Client-side validation
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
      // Clear logout flag before attempting login
      localStorage.removeItem('isLoggingOut');
      
      const result = await login({ email, password });
      
      if (result.success) {
        // Clear logout flag on successful login
        localStorage.removeItem('isLoggingOut');
        // Navigation handled by AuthContext
        const from = (location.state as any)?.from?.pathname || '/';
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/98 to-secondary relative overflow-hidden">
        {/* Professional Background Elements */}
        <div className="absolute inset-0">
          {/* Subtle radial gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/8 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/4 via-transparent to-transparent" />
          
          {/* Professional grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
          </div>
          
          {/* Subtle depth elements - Professional */}
          <div className="absolute top-24 right-24 w-80 h-80 bg-white/4 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-40 left-20 w-96 h-96 bg-white/3 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full h-full p-12 lg:p-16 text-primary-foreground">
          <div className="text-center space-y-12 max-w-2xl animate-fade-in">
            {/* Logo - Elegant & Large Design */}
            <div className="flex justify-center mb-12">
              <div className="relative group">
                {/* Elegant glow effect */}
                <div className="absolute -inset-8 bg-white/6 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                {/* Logo container - Elegant & Clean - Larger */}
                <div className="relative w-72 h-72 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.02] group-hover:border-white/30 group-hover:shadow-3xl">
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />
                  {/* Inner glow */}
                  <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
                  <img 
                    src={logoImage} 
                    alt="AGSouth Logo" 
                    className="relative w-full h-full object-contain p-5 z-10 drop-shadow-lg"
                  />
                </div>
              </div>
            </div>
            
            {/* Brand Identity - Elegant Typography */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold font-heading tracking-tight leading-tight text-white drop-shadow-sm">
                  AGSOUTH FRUITS PACIFIC
                </h1>
                <h2 className="text-4xl font-bold font-heading tracking-tight leading-tight text-white drop-shadow-sm">
                  BRANCH OFFICE
                </h2>
                <p className="text-sm text-white/65 font-normal mt-4 tracking-wide">
                  Agrisouth Jersey Ltd.
                </p>
              </div>
              
              {/* Elegant Divider */}
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/20 to-white/30 rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  </div>
                  <div className="w-32 h-px bg-gradient-to-l from-transparent via-white/20 to-white/30 rounded-full" />
                </div>
              </div>
              
              {/* Platform Tagline - Elegant */}
              <div className="pt-2">
                <p className="text-xs text-white/80 font-semibold tracking-[0.3em] uppercase mb-3 letter-spacing-wide">
                  Business Intelligence Platform
                </p>
                <p className="text-xs text-white/55 font-light leading-relaxed max-w-md mx-auto">
                  Advanced analytics and insights for your agricultural operations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo showText={true} />
          </div>

          {/* Login Card - Professional Corporate Design */}
          <div className="bg-card rounded-xl shadow-lg border border-border/50 p-8 lg:p-10 relative overflow-hidden">
            {/* Subtle professional overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />
            
            {/* Minimal background pattern */}
            <div className="absolute inset-0 opacity-[0.01]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
            </div>
            
            <div className="relative z-10 space-y-7">
              {/* Header - Professional */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold font-heading text-foreground tracking-tight">
                  Sign In
                </h2>
                <div className="w-12 h-0.5 bg-primary/20 mx-auto rounded-full" />
                <p className="text-muted-foreground text-sm font-normal">
                  Access your business intelligence dashboard
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        "pl-11 h-11 rounded-lg border-border/50 bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 text-sm",
                        emailError && "border-destructive focus:border-destructive focus:ring-destructive/10"
                      )}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-destructive" />
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-11 rounded-lg border-border/50 bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 text-sm"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/40"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
                    />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm font-normal">
                      Remember me
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                  >
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 shadow-sm hover:shadow-md rounded-lg mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Security Badge - Professional */}
              <div className="relative pt-5 border-t border-border/40">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-lg border border-border/30">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/65 font-medium tracking-[0.12em] uppercase">
                      Secure Connection
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Professional */}
          <p className="text-center text-xs text-muted-foreground/60 font-normal">
            © 2024 Agrisouth. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

