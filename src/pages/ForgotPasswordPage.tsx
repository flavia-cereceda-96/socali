import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="text-5xl">✉️</div>
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">
            We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
          </p>
          <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <div className="mb-3 text-5xl">🔐</div>
          <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full font-semibold" size="lg">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
