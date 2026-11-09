import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LegalLinks } from '@/components/LegalLinks';
import CalMascot from '@/components/CalMascot';
import heroImg from '@/assets/friends-planning-flat.jpg';

const SPLASH_KEY = 'synccircle_seen_splash';

export function markSplashSeen() {
  try { localStorage.setItem(SPLASH_KEY, 'true'); } catch {}
}

export function hasSeenSplash() {
  try { return localStorage.getItem(SPLASH_KEY) === 'true'; } catch { return true; }
}

const SplashPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const refSuffix = searchParams.get('ref') ? `?ref=${searchParams.get('ref')}` : '';

  const goOnboarding = () => {
    markSplashSeen();
    navigate(`/onboarding${refSuffix}`);
  };
  const goLogin = () => {
    markSplashSeen();
    navigate(`/login${refSuffix}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background px-6 pb-8 pt-6">
      {/* soft background blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-md items-center justify-center gap-2.5">
        <CalMascot mood="happy" size={36} />
        <span className="text-lg font-bold tracking-[0.3em] text-foreground">C A L I</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mt-6 w-full max-w-md"
      >
        <motion.img
          src={heroImg}
          alt="Friends gathered around a calendar planning a picnic, coffee and a concert"
          width={1024}
          height={896}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full mix-blend-multiply"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 mt-7 w-full max-w-md text-center"
      >
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          Your social calendar, shared with friends
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          See who's free, make plans in seconds, and never miss a hangout again.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="relative z-10 mt-7 flex w-full max-w-md flex-col items-center gap-2"
      >
        <Button onClick={goOnboarding} size="lg" className="w-full font-semibold">
          Get Started
        </Button>
        <button
          onClick={goLogin}
          className="py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          I already have an account
        </button>
      </motion.div>
      <LegalLinks />
    </div>
  );
};

export default SplashPage;
