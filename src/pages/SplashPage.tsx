import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LegalLinks } from '@/components/LegalLinks';
import { Users, MessageCircle, CalendarCheck } from 'lucide-react';
import heroImg from '@/assets/friends-planning.jpg';

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
  const { t } = useTranslation();

  const refSuffix = searchParams.get('ref') ? `?ref=${searchParams.get('ref')}` : '';

  const goOnboarding = () => {
    markSplashSeen();
    navigate(`/onboarding${refSuffix}`);
  };
  const goLogin = () => {
    markSplashSeen();
    navigate(`/login${refSuffix}`);
  };

  const benefits = [
    { icon: Users, text: t('splash.benefit1') },
    { icon: MessageCircle, text: t('splash.benefit2') },
    { icon: CalendarCheck, text: t('splash.benefit3') },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background px-6 pb-8 pt-6">
      {/* soft background blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-md items-center justify-between">
        <span className="text-lg font-bold tracking-[0.3em] text-foreground">C A L I</span>
        <LanguageToggle variant="inline" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mt-6 w-full max-w-md"
      >
        <motion.img
          src={heroImg}
          alt={t('splash.illustrationAlt')}
          width={1024}
          height={896}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full rounded-3xl shadow-lg"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 mt-7 w-full max-w-md text-center"
      >
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          {t('splash.headline')}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{t('splash.subhead')}</p>
      </motion.div>

      <ul className="relative z-10 mt-6 flex w-full max-w-md flex-col gap-2">
        {benefits.map(({ icon: Icon, text }, i) => (
          <motion.li
            key={text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.1, duration: 0.4 }}
            className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            {text}
          </motion.li>
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="relative z-10 mt-7 flex w-full max-w-md flex-col items-center gap-2"
      >
        <Button onClick={goOnboarding} size="lg" className="w-full font-semibold">
          {t('splash.getStarted')}
        </Button>
        <button
          onClick={goLogin}
          className="py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('splash.logIn')}
        </button>
      </motion.div>
      <LegalLinks />
    </div>
  );
};

export default SplashPage;
