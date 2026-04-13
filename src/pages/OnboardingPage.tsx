import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const usageOptions = [
  { value: 'spouse', label: 'With my partner', emoji: '💑' },
  { value: 'friends', label: 'With friends', emoji: '👯' },
  { value: 'own', label: 'My own plans', emoji: '📋' },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usage, setUsage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'Required';
    else if (/\s/.test(username)) errs.username = 'No spaces allowed';
    else if (username.length < 3) errs.username = 'At least 3 characters';
    if (!email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!usage) errs.usage = 'Pick one';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    localStorage.setItem('onboarded', 'true');
    localStorage.setItem('user', JSON.stringify({ username, email, usage }));
    navigate('/');
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
          <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Let's set up your account</p>
        </div>

        <div className="space-y-5">
          {/* Username */}
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
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Usage */}
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

        <Button onClick={handleSubmit} className="w-full font-semibold" size="lg">
          Get Started 🚀
        </Button>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
