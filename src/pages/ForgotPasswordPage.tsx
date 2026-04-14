import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'newpass'>('email');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Reset code sent to your email! 📧');
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
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Code verified! Set your new password.');
      setStep('newpass');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Password updated! 🎉');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setUpdating(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) { toast.error(error.message); return; }
      toast.success('New code sent! 📧');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: New password
  if (step === 'newpass') {
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
            <p className="mt-1 text-sm text-muted-foreground">Enter your new password below</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
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
                onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
              />
            </div>
          </div>

          <Button onClick={handleUpdatePassword} disabled={updating} className="w-full font-semibold" size="lg">
            {updating ? 'Updating...' : 'Update Password'}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Step 2: OTP verification
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
            <h1 className="text-2xl font-bold text-foreground">Enter Reset Code</h1>
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
            {verifying ? 'Verifying...' : 'Verify Code'}
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn't receive it?{' '}
            <button onClick={handleResend} disabled={loading} className="text-primary font-medium hover:underline">
              {loading ? 'Sending...' : 'Resend code'}
            </button>
          </p>

          <button onClick={() => setStep('email')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Step 1: Enter email
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
            Enter your email and we'll send you a code to reset your password
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
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
            />
          </div>
        </div>

        <Button onClick={handleSendOtp} disabled={loading} className="w-full font-semibold" size="lg">
          {loading ? 'Sending...' : 'Send Reset Code'}
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
