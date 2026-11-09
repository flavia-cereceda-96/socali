import { toast } from 'sonner';
import CalMascot from '@/components/CalMascot';

/**
 * The app's normal success toast, with Cal winking on the left.
 * Used for the moments worth celebrating: a confirmed date or activity
 * poll, and a "Going" RSVP.
 */
export function mascotSuccessToast(message: string) {
  toast.success(message, { icon: <CalMascot mood="wink" size={40} /> });
}
