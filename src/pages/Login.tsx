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
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
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
      const result = await login({ email, password });
      
      if (result.success) {
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
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/95 to-secondary relative overflow-hidden">
        {/* Agriculture-Inspired Background */}
        <div className="absolute inset-0">
          {/* Organic Pattern Overlay - Subtle leaf/fruit shapes */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Organic circular patterns representing fruits */}
              <circle cx="100" cy="100" r="60" fill="white" opacity="0.1" />
              <circle cx="300" cy="150" r="50" fill="white" opacity="0.08" />
              <circle cx="200" cy="300" r="70" fill="white" opacity="0.1" />
              {/* Leaf-like organic shapes */}
              <ellipse cx="350" cy="250" rx="40" ry="80" fill="white" opacity="0.06" transform="rotate(45 350 250)" />
              <ellipse cx="50" cy="300" rx="50" ry="100" fill="white" opacity="0.06" transform="rotate(-30 50 300)" />
            </svg>
          </div>
          
          {/* Subtle Grid - Organic feel */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
          
          {/* Natural Light Gradients - Like sunlight through leaves */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(255,255,255,0.12),transparent_60%),radial-gradient(ellipse_at_80%_70%,rgba(255,255,255,0.08),transparent_60%)]" />
          
          {/* Organic Flow Lines - Representing growth */}
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            {/* Curved organic lines */}
            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,30 Q25,20 50,30 T100,30" stroke="rgba(255,255,255,0.05)" fill="none" strokeWidth="0.5" />
              <path d="M0,70 Q25,80 50,70 T100,70" stroke="rgba(255,255,255,0.05)" fill="none" strokeWidth="0.5" />
            </svg>
          </div>
          
          {/* Natural Depth - Layered organic shapes */}
          <div className="absolute top-1/5 right-1/4 w-80 h-80 bg-white/4 rounded-full blur-3xl" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
          <div className="absolute bottom-1/5 left-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl" style={{ borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full h-full p-12 text-primary-foreground">
          <div className="text-center space-y-10 max-w-xl animate-fade-in">
            {/* Logo - Enhanced with natural glow */}
            <div className="flex justify-center mb-12">
              <div className="relative group">
                {/* Natural Glow Effect - Like morning light */}
                <div className="absolute inset-0 bg-white/15 rounded-3xl blur-3xl group-hover:blur-[4rem] transition-all duration-700" />
                {/* Logo Container - Organic rounded corners */}
                <div className="relative w-64 h-64 rounded-3xl bg-white/8 backdrop-blur-2xl flex items-center justify-center border border-white/15 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-white/25 group-hover:bg-white/12">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <img 
                    src={logoImage} 
                    alt="Agrisouth Logo" 
                    className="relative w-full h-full object-contain p-10 z-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Brand Name - Clean and Modern */}
            <div className="space-y-6">
              <h1 className="text-7xl font-bold font-heading tracking-tight leading-none text-white drop-shadow-lg">
                Agrisouth
              </h1>
              
              {/* Organic Divider - Inspired by natural elements */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-12 h-px bg-white/30 rounded-full" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-20 h-px bg-white/30 rounded-full" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-12 h-px bg-white/30 rounded-full" />
              </div>
              
              <p className="text-3xl text-white/95 font-semibold tracking-wider uppercase drop-shadow-md">
                Fruits Pacific
              </p>
              
              {/* Subtitle - Subtle and elegant */}
              <p className="text-base text-white/75 font-light tracking-wide pt-3 letter-spacing-wide">
                Business Intelligence Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo showText={true} />
          </div>

          {/* Login Card - Modern & Clean */}
          <div className="bg-card/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/50 p-10 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:2rem_2rem]" />
            </div>
            
            <div className="relative z-10 space-y-7">
              {/* Header */}
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold font-heading text-foreground tracking-tight">
                  Welcome
                </h2>
                <div className="w-12 h-0.5 bg-primary/30 mx-auto rounded-full" />
                <p className="text-muted-foreground text-sm font-light">
                  Sign in to access the analytics dashboard
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        "pl-12 h-14 rounded-xl border-border/50 bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                        emailError && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive mt-1">{emailError}</p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-14 rounded-xl border-border/50 bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
                    />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
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
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center items-center gap-2">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span className="bg-card px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Secure Login
                  </span>
                  <Shield className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/80 font-light">
            © 2024 Agrisouth. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

