import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Eye, EyeOff, Check, X, Loader2, Sparkles } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { UsageTile } from '@/components/onboarding/UsageTile';
import { PasswordStrength } from '@/components/onboarding/PasswordStrength';
import { useTranslation } from 'react-i18next';
import { isSupportedLang } from '@/hooks/useLanguagePreference';

const usageOptions = [
  { value: 'spouse', label: 'With my partner', emoji: '💑', description: 'Coordinate dates & plans together' },
  { value: 'friends', label: 'With friends', emoji: '👯', description: 'Organise group hangs & events' },
  { value: 'own', label: 'My own plans', emoji: '📋', description: 'Keep your schedule personal' },
];

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usage, setUsage] = useState<string>('');
  const [bio, setBio] = useState('');
  const [suggestingBio, setSuggestingBio] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // OTP verification state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Real-time username availability check (debounced)
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus('idle');
      return;
    }
    if (trimmed.length < 3 || /[^a-z0-9_]/.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', trimmed)
        .maybeSingle();
      if (error) {
        setUsernameStatus('idle');
        return;
      }
      setUsernameStatus(data ? 'taken' : 'available');
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSuggestVibe = async () => {
    if (!usage) {
      toast.error('Pick what you\'ll use Cali for first ✨');
      return;
    }
    setSuggestingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-vibe', {
        body: { usage },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const suggestion = (data?.suggestion ?? '').slice(0, 200);
      if (suggestion) {
        setBio(suggestion);
        toast.success('Fresh vibe added ✨');
      } else {
        toast.error('Couldn\'t generate a vibe — try again');
      }
    } catch (err: any) {
      toast.error(err.message || 'Vibe suggestion failed');
    } finally {
      setSuggestingBio(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'Required';
    else if (usernameStatus === 'invalid') errs.username = 'Use lowercase letters, numbers, or underscores';
    else if (usernameStatus === 'taken') errs.username = 'Username already taken';
    else if (username.length < 3) errs.username = 'At least 3 characters';
    if (!email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Required';
    else if (password.length < 8) errs.password = 'At least 8 characters';
    if (!usage) errs.usage = 'Pick one';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, usage },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Verification code sent to your email! 📧');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      // Upload avatar if selected
      if (avatarFile && data.user) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${data.user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('user_id', data.user.id);
        }
      }

      // Save bio + preferred language if account verified
      const lang = isSupportedLang(i18n.language) ? i18n.language : 'en';
      if (data.user) {
        await supabase
          .from('profiles')
          .update({
            preferred_language: lang,
            ...(bio.trim() ? { bio: bio.trim() } : {}),
          })
          .eq('user_id', data.user.id);
      }

      toast.success('Account verified! 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('New code sent! Check your email 📧');
    } finally {
      setLoading(false);
    }
  };

  // OTP Step
  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          <div>
            <div className="mb-3 text-5xl">✉️</div>
            <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button onClick={handleVerifyOtp} disabled={verifying || otp.length < 6} className="w-full font-semibold" size="lg">
            {verifying ? 'Verifying...' : 'Verify & Continue 🚀'}
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn't receive it?{' '}
            <button onClick={handleResendOtp} disabled={loading} className="text-primary font-medium hover:underline">
              {loading ? 'Sending...' : 'Resend code'}
            </button>
          </p>

          <button onClick={() => setStep('form')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to form
          </button>
        </motion.div>
      </div>
    );
  }

  const bioCounterColor =
    bio.length >= 195 ? 'text-destructive' : bio.length >= 170 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mb-3 text-5xl"
          >
            🗓️
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your account to get started</p>
        </div>

        <div className="space-y-5">
          {/* Avatar upload */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary ring-2 ring-border">
                  <Camera className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground -mt-3">
            {avatarPreview ? 'Tap to change' : 'Add a profile photo'}
          </p>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname"
                autoComplete="username"
                className="pr-9"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-600 dark:text-green-500" />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This is how friends will find and @mention you · lowercase, no spaces
            </p>
            {usernameStatus === 'available' && username.length >= 3 && (
              <p className="text-xs text-green-600 dark:text-green-500">✓ @{username} is available</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-xs text-destructive">@{username} is already taken</p>
            )}
            {errors.username && usernameStatus !== 'taken' && usernameStatus !== 'available' && (
              <p className="text-xs text-destructive">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              We'll send you a quick verification link — no spam, ever.
            </p>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
            <p className="text-xs text-muted-foreground">At least 8 characters</p>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Usage */}
          <div className="space-y-2">
            <Label>What will you use this for?</Label>
            <div className="space-y-2">
              {usageOptions.map(opt => (
                <UsageTile
                  key={opt.value}
                  emoji={opt.emoji}
                  label={opt.label}
                  description={opt.description}
                  selected={usage === opt.value}
                  onClick={() => setUsage(opt.value)}
                />
              ))}
            </div>
            {errors.usage && <p className="text-xs text-destructive">{errors.usage}</p>}
          </div>

          {/* Vibe */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Your vibe</Label>
              <button
                type="button"
                onClick={handleSuggestVibe}
                disabled={suggestingBio}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {suggestingBio ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {suggestingBio ? 'Thinking...' : 'Suggest one'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">What should friends invite you to — and what's a hard pass?</p>
            <textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 200))}
              placeholder="e.g. Always down for brunch 🥞 & hiking 🥾. Skip me on karaoke nights 🎤😅"
              rows={3}
              maxLength={200}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:italic focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className={cn('text-right text-[10px] font-medium transition-colors', bioCounterColor)}>
              {bio.length}/200
            </p>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full font-semibold" size="lg">
          {loading ? 'Creating...' : 'Get Started 🚀'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
