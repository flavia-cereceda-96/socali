import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Check if this is a password recovery session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Check URL hash for type=recovery
      const hash = window.location.hash;
      const hasRecoveryToken = hash.includes('type=recovery') || hash.includes('access_token');
      
      if (hasRecoveryToken || session) {
        setIsValid(true);
      } else {
        toast.error('Invalid or expired reset link. Please request a new one.');
        navigate('/forgot-password');
      }
      setValidating(false);
    };
    
    checkSession();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-muted-foreground">Validating reset link...</div>
      </div>
    );
  }

  if (!isValid) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <div className="mb-3 text-5xl">🔑</div>
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full font-semibold" size="lg">
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
