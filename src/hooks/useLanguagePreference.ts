import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LANG_STORAGE_KEY, LanguageCode, SUPPORTED_LANGUAGES } from '@/i18n';

export function isSupportedLang(value: string | null | undefined): value is LanguageCode {
  return !!value && SUPPORTED_LANGUAGES.some(l => l.code === value);
}

/** Reads the user's preferred language from their profile and syncs i18n once on login. */
export function useSyncLanguageFromProfile() {
  const { i18n } = useTranslation();
  useQuery({
    queryKey: ['preferred-language'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('user_id', user.id)
        .maybeSingle();
      const lang = (data as any)?.preferred_language;
      if (isSupportedLang(lang) && i18n.language !== lang) {
        await i18n.changeLanguage(lang);
        try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
      }
      return lang || null;
    },
  });
}

/** Mutation to update the user's preferred language (DB + localStorage + i18n). */
export function useChangeLanguage() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lang: LanguageCode) => {
      await i18n.changeLanguage(lang);
      try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang } as any)
          .eq('user_id', user.id);
      }
      return lang;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferred-language'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/** Convenience hook combining current + setter. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const change = useChangeLanguage();
  const current = (isSupportedLang(i18n.language) ? i18n.language : 'en') as LanguageCode;
  return { current, change: change.mutate, isChanging: change.isPending };
}
