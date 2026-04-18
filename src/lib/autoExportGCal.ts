import { supabase } from '@/integrations/supabase/client';
import { buildGoogleCalendarUrl, GCalEventInput } from './googleCalendar';

/**
 * If the current user has gcal_auto_export enabled, open Google Calendar
 * in a new tab to add this event. Returns true if opened.
 */
export async function autoExportToGCalIfEnabled(event: GCalEventInput): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
      .from('profiles')
      .select('gcal_auto_export')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!(profile as any)?.gcal_auto_export) return false;
    const url = buildGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
