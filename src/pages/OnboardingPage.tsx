import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';

const usageOptions = [
  { value: 'spouse', label: 'With my partner', emoji: '💑' },
  { value: 'friends', label: 'With friends', emoji: '👯' },
  { value: 'own', label: 'My own plans', emoji: '📋' },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usage, setUsage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'Required';
    else if (/\s/.test(username)) errs.username = 'No spaces allowed';
    else if (username.length < 3) errs.username = 'At least 3 characters';
    if (!email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    if (!usage) errs.usage = 'Pick one';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
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

      // Upload avatar if selected
      if (avatarFile && signUpData.user) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${signUpData.user.id}/avatar.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('user_id', signUpData.user.id);
        }
      }

      toast.success('Account created! 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
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

          <div className="space-y-1.5">
            <Label htmlFor="username">Account name</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="yourname"
              autoComplete="username"
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>

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
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>What will you use this for?</Label>
            <div className="grid grid-cols-3 gap-2">
              {usageOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUsage(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium transition-all border',
                    usage === opt.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.usage && <p className="text-xs text-destructive">{errors.usage}</p>}
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
