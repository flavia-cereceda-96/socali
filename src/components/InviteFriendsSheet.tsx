import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INVITE_URL = 'https://socali.lovable.app';
const INVITE_MESSAGE = `Hey! I'm using Cali to plan things — join me here: ${INVITE_URL}`;

export function InviteFriendsSheet({ open, onOpenChange }: InviteFriendsSheetProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_MESSAGE);
      toast.success('Copied! ✓');
    } catch {
      toast.error("Couldn't copy — try again");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Join me on Cali',
          text: INVITE_MESSAGE,
          url: INVITE_URL,
        });
      } catch {
        // User cancelled or error — silent
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t-0 px-5 pb-8 pt-5 max-w-md mx-auto"
      >
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg">Invite a friend</SheetTitle>
        </SheetHeader>

        <div className="rounded-2xl bg-secondary/60 p-4 mb-5">
          <p className="text-sm text-foreground leading-relaxed">{INVITE_MESSAGE}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button onClick={handleCopy} size="lg" variant="outline" className="w-full gap-2 font-semibold">
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button onClick={handleShare} size="lg" className="w-full gap-2 font-semibold">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
