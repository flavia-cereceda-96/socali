import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const SUPPORT_EMAIL = 'socali.project26@gmail.com';

export function LegalLinks() {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  return <nav aria-label={es ? 'Información legal' : 'Legal information'} className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-4 text-xs text-muted-foreground">
    <Link className="hover:text-foreground underline" to="/privacy">{es ? 'Privacidad' : 'Privacy'}</Link>
    <Link className="hover:text-foreground underline" to="/terms">{es ? 'Condiciones' : 'Terms'}</Link>
    <a className="hover:text-foreground underline" href={`mailto:${SUPPORT_EMAIL}`}>{es ? 'Ayuda' : 'Support'}</a>
  </nav>;
}