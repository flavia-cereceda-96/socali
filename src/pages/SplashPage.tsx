import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

const SPLASH_KEY = 'synccircle_seen_splash';

export function markSplashSeen() {
  try { localStorage.setItem(SPLASH_KEY, 'true'); } catch {}
}

export function hasSeenSplash() {
  try { return localStorage.getItem(SPLASH_KEY) === 'true'; } catch { return true; }
}

const SplashPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const goOnboarding = () => {
    markSplashSeen();
    navigate('/onboarding');
  };
  const goLogin = () => {
    markSplashSeen();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-5 text-6xl">🗓️</div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Cali</h1>
        <p className="mt-3 text-base text-muted-foreground">
          {t('splash.tagline')}
        </p>
      </motion.div>

      {/* Language picker — first thing the user sees */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-10 w-full max-w-xs"
      >
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('language.title')}
        </p>
        <div className="flex justify-center">
          <LanguageToggle variant="inline" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-10 flex w-full max-w-xs flex-col items-center gap-3"
      >
        <Button onClick={goOnboarding} size="lg" className="w-full font-semibold">
          {t('splash.getStarted')}
        </Button>
        <button
          onClick={goLogin}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {t('splash.logIn')}
        </button>
      </motion.div>
    </div>
  );
};

export default SplashPage;
