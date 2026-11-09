import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LegalLinks } from '@/components/LegalLinks';
import CalMascot from '@/components/CalMascot';
import { cn } from '@/lib/utils';

const SPLASH_KEY = 'synccircle_seen_splash';

export function markSplashSeen() {
  try { localStorage.setItem(SPLASH_KEY, 'true'); } catch {}
}

export function hasSeenSplash() {
  try { return localStorage.getItem(SPLASH_KEY) === 'true'; } catch { return true; }
}

/** A decorative plan sticker: tilted card that eases in, unless motion is reduced. */
function Sticker({
  delay,
  rotate,
  className,
  children,
}: {
  delay: number;
  rotate: number;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={{ transform: `rotate(${rotate}deg)` }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotate }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FACES = [
  { initials: 'M', bg: 'bg-lilac' },
  { initials: 'S', bg: 'bg-secondary' },
  { initials: 'J', bg: 'bg-peach' },
];

function FacePile() {
  return (
    <span className="flex">
      {FACES.map((face, i) => (
        <span
          key={face.initials}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-foreground ring-2 ring-card',
            face.bg,
            i > 0 && '-ml-1.5',
          )}
        >
          {face.initials}
        </span>
      ))}
    </span>
  );
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-secondary px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <span className="text-base font-bold tracking-[0.3em] text-foreground">C A L I</span>

        {/* Illustrative plan stickers — not live data */}
        <div aria-hidden className="relative mx-auto mt-6 h-[410px] w-full max-w-[360px]">
          <Sticker
            delay={0.05}
            rotate={-6}
            className="absolute left-0 top-2 w-[228px] rounded-[20px] bg-card p-4 shadow-sticker"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] text-primary">SAT</p>
            <p className="mt-1 text-[19px] font-bold leading-tight text-foreground">Brunch at Bloom</p>
            <div className="mt-2.5 flex items-center gap-2">
              <FacePile />
              <span className="text-xs font-semibold text-muted-foreground">3 going</span>
            </div>
          </Sticker>

          <Sticker
            delay={0.16}
            rotate={5}
            className="absolute right-0 top-[132px] w-[196px] rounded-[20px] bg-accent p-4 text-accent-foreground shadow-sticker"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] opacity-70">FRI</p>
            <p className="mt-1 text-[19px] font-bold leading-tight">Gig night</p>
            <p className="mt-2 text-xs font-bold">2 spots left</p>
          </Sticker>

          <Sticker
            delay={0.27}
            rotate={-3}
            className="absolute bottom-[96px] left-1 w-[236px] rounded-[20px] bg-primary p-4 text-primary-foreground shadow-sticker"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] text-mint-strong">SUN</p>
            <p className="mt-1 text-[19px] font-bold leading-tight">Sunset hike</p>
            <p className="mt-2 text-xs font-semibold opacity-90">Date poll · 4 votes</p>
          </Sticker>

          <Sticker
            delay={0.4}
            rotate={8}
            className="absolute bottom-0 right-1 grid h-32 w-32 place-items-center rounded-full bg-card shadow-sticker"
          >
            <CalMascot mood="happy" size={108} />
          </Sticker>
        </div>

        <div className="mt-2">
          <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-foreground">
            Your social calendar, shared with friends
          </h1>
          <p className="mt-3 text-base text-on-mint">
            See who's free, make plans in seconds, never miss a hangout.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-1 pt-6">
          <button
            onClick={goOnboarding}
            className="h-14 w-full rounded-2xl bg-foreground text-base font-semibold text-background transition-opacity hover:opacity-90"
          >
            Get started
          </button>
          <button
            onClick={goLogin}
            className="h-12 w-full text-sm font-semibold text-foreground transition-opacity hover:opacity-70"
          >
            I already have an account
          </button>
          <LegalLinks className="text-[13px]" />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
