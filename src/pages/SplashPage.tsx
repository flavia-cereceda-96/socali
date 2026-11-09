import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LegalLinks } from '@/components/LegalLinks';
import CalMascot from '@/components/CalMascot';

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-secondary px-6 pb-8 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="mx-auto w-full max-w-md">
        <span className="text-lg font-bold tracking-[0.3em] text-foreground">C A L I</span>
      </div>

      {/* Illustrative sticker collage — not live data */}
      <div aria-hidden className="relative mx-auto mt-8 h-[300px] w-full max-w-[340px]">
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="absolute left-0 top-4 w-[210px] rounded-3xl border border-border bg-card p-4 shadow-elevated"
        >
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground">SAT</p>
          <p className="text-lg font-bold text-foreground">Brunch at Bloom</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex">
              {['--lilac', '--peach', '--accent'].map((c, i) => (
                <span key={c} className="h-6 w-6 rounded-full ring-2 ring-card" style={{ backgroundColor: `hsl(var(${c}))`, marginLeft: i ? -6 : 0 }} />
              ))}
            </span>
            <span className="text-xs font-medium text-muted-foreground">3 going</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, rotate: 5 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="absolute right-0 top-[92px] w-[190px] rounded-3xl bg-accent p-4 text-accent-foreground shadow-elevated"
        >
          <p className="text-[11px] font-bold tracking-wide opacity-70">FRI</p>
          <p className="text-lg font-bold">Gig night</p>
          <p className="mt-1 text-xs font-semibold">2 spots left</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: -3 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="absolute bottom-0 left-6 w-[220px] rounded-3xl bg-primary p-4 text-primary-foreground shadow-elevated"
        >
          <p className="text-[11px] font-bold tracking-wide opacity-80">SUN</p>
          <p className="text-lg font-bold">Sunset hike</p>
          <p className="mt-1 text-xs font-medium opacity-90">Date poll · 4 votes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 16 }}
          className="absolute -top-2 right-4 flex h-[92px] w-[92px] items-center justify-center rounded-full bg-card shadow-elevated"
        >
          <CalMascot mood="happy" size={76} animate />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mx-auto mt-10 w-full max-w-md"
      >
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight text-foreground">
          Your social calendar, shared with friends
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          See who's free, make plans in seconds, and never miss a hangout again.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-2"
      >
        <button onClick={goOnboarding} className="h-14 w-full rounded-full bg-foreground text-base font-semibold text-background">
          Get started
        </button>
        <button
          onClick={goLogin}
          className="py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
        >
          I already have an account
        </button>
      </motion.div>
      <LegalLinks />
    </div>
  );
};

export default SplashPage;
