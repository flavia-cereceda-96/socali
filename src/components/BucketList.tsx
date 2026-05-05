import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, CalendarPlus, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useBucketListItems,
  useAddBucketListItem,
  useMarkBucketListItemDone,
  useDeleteBucketListItem,
  type BucketListItem,
} from '@/hooks/useBucketList';
import { cn } from '@/lib/utils';

interface Props {
  bucketListId: string | undefined;
  currentUserId: string | null;
  /** When provided, "Plan this!" pre-selects this friend in event creation */
  inviteFriendId?: string;
  inviteFriendName?: string;
  /** When provided, "Plan this!" pre-selects this group in event creation */
  inviteGroupId?: string;
}

const quickEmojis = ['✨', '🍝', '🎬', '🏃', '🏖️', '🎵', '🎉', '🍕', '🌍'];

export function BucketList({ bucketListId, currentUserId, inviteFriendId, inviteFriendName, inviteGroupId }: Props) {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useBucketListItems(bucketListId);
  const addItem = useAddBucketListItem();
  const markDone = useMarkBucketListItemDone();
  const removeItem = useDeleteBucketListItem();

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('✨');

  const total = items.length;
  const done = items.filter(i => i.status === 'done').length;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEmoji('✨');
    setShowAdd(false);
  };

  const submitAdd = async () => {
    if (!bucketListId || !title.trim()) return;
    try {
      await addItem.mutateAsync({ bucketListId, title: title.trim(), description: description.trim(), emoji });
      resetForm();
    } catch (e: any) {
      toast.error(e.message || 'Could not add item');
    }
  };

  const planThis = (item: BucketListItem) => {
    const params = new URLSearchParams();
    params.set('bucketItemId', item.id);
    params.set('title', item.title);
    if (item.emoji) params.set('emoji', item.emoji);
    navigate(`/create?${params.toString()}`, {
      state: inviteFriendId
        ? { inviteFriendId, inviteFriendName }
        : inviteGroupId
          ? { inviteGroupId }
          : undefined,
    });
  };

  const isPastEvent = (item: BucketListItem) => {
    const d = item.linked_event?.date;
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(d + 'T00:00:00') < today;
  };

  return (
    <section id="bucket-list" className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Bucket list
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {done}/{total} done
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
          aria-label="Add item"
        >
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-3 shadow-card space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {quickEmojis.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all',
                      emoji === e ? 'bg-primary/20 ring-2 ring-primary/40' : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What do you want to do together?"
              />
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional details"
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={submitAdd} disabled={!title.trim() || addItem.isPending} className="flex-1">
                  Add
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!bucketListId || isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center">
          <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">No bucket list items yet — add the first thing you want to do!</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(item => {
            const isDone = item.status === 'done';
            const canMarkDone = !isDone && item.linked_event_id && isPastEvent(item);
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-2xl bg-card p-3 shadow-card flex flex-col gap-2',
                  isDone && 'opacity-80'
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">
                    {isDone ? '✅' : item.emoji || '✨'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-foreground', isDone && 'line-through text-muted-foreground')}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className={cn('text-xs text-muted-foreground mt-0.5', isDone && 'line-through')}>
                        {item.description}
                      </p>
                    )}
                    {item.linked_event && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        Event planned: {item.linked_event.title}
                      </span>
                    )}
                  </div>
                  {currentUserId === item.added_by && !isDone && (
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {!isDone && (
                  <div className="flex gap-2">
                    {!item.linked_event_id && (
                      <Button size="sm" variant="secondary" onClick={() => planThis(item)} className="flex-1 gap-1.5 h-8">
                        <CalendarPlus className="h-3.5 w-3.5" /> Plan this!
                      </Button>
                    )}
                    {item.linked_event_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/event/${item.linked_event_id}`)}
                        className="flex-1 h-8"
                      >
                        Open event
                      </Button>
                    )}
                    {canMarkDone && (
                      <Button size="sm" onClick={() => markDone.mutate(item.id)} className="gap-1.5 h-8">
                        <Check className="h-3.5 w-3.5" /> Mark as done
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}