import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { LegalLinks } from '@/components/LegalLinks';
import CalMascot from '@/components/CalMascot';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refSuffix = searchParams.get('ref') ? `?ref=${searchParams.get('ref')}` : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = async () => {
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    let invalid = false;
    if (!email.trim()) {
      setEmailError('Enter your email');
      invalid = true;
    }
    if (!password) {
      setPasswordError('Enter your password');
      invalid = true;
    }
    if (invalid) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(error.message);
        return;
      }
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Mint header with a small Cal moment */}
      <div className="rounded-b-[32px] bg-secondary px-6 pb-7 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate(`/welcome${refSuffix}`)}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-sticker transition-opacity hover:opacity-80"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-base font-bold tracking-[0.3em] text-foreground">C A L I</span>
          </div>

          <div aria-hidden className="mt-5 flex items-end gap-3">
            <CalMascot mood="wink" size={88} />
            <span className="rounded-[16px_16px_16px_4px] bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sticker">
              Welcome back!
            </span>
          </div>
        </div>
      </div>

      {/* Form on white */}
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-7">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">Log in</h1>
        <p className="mt-1 text-base text-muted-foreground">Good to see you again.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-sm font-bold text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!emailError}
              className="h-[52px] rounded-[14px] border-0 bg-muted px-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
            {emailError && <p className="mt-1.5 text-sm font-medium text-danger">{emailError}</p>}
          </div>

          <div>
            <Label htmlFor="password" className="mb-1.5 block text-sm font-bold text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!passwordError}
                className="h-[52px] rounded-[14px] border-0 bg-muted px-4 pr-12 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-sm font-medium text-danger">{passwordError}</p>}
            {formError && <p className="mt-1.5 text-sm font-medium text-danger">{formError}</p>}
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-bold text-foreground hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-foreground text-base font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            New to Cali?{' '}
            <Link to={`/onboarding${refSuffix}`} className="font-bold text-foreground hover:underline">
              Get started
            </Link>
          </p>
        </form>

        <div className="mt-auto">
          <LegalLinks className="text-[13px]" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
