import { useState } from 'react';
import { useFriends, DbProfile } from '@/hooks/useEvents';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const quickEmojis = ['🍝', '🎬', '🏃', '🎮', '🍕', '☕', '🎉', '🎵', '🏕️'];

const CreateEventPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefilledDate = searchParams.get('date') || '';
  const { data: friends = [] } = useFriends();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<DbProfile[]>([]);
  const [dateStr, setDateStr] = useState(prefilledDate);
  const [endDateStr, setEndDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleFriend = (f: DbProfile) => {
    setSelectedFriends(prev =>
      prev.find(p => p.user_id === f.user_id) ? prev.filter(p => p.user_id !== f.user_id) : [...prev, f]
    );
  };

  const canSubmit = title.trim() && dateStr && (isMultiDay ? endDateStr : startTime);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { data: event, error } = await supabase.from('events').insert({
        title,
        emoji,
        date: dateStr,
        end_date: isMultiDay ? endDateStr : null,
        time: isMultiDay ? null : (startTime || null),
        end_time: isMultiDay ? null : (endTime || null),
        location: location || null,
        notes: notes || null,
        is_trip: isMultiDay,
        created_by: user.id,
      }).select().single();

      if (error) {
        toast.error(error.message);
        return;
      }

      // Add participants and create activity
      if (selectedFriends.length > 0 && event) {
        const { error: pError } = await supabase.from('event_participants').insert(
          selectedFriends.map(f => ({
            event_id: event.id,
            user_id: f.user_id,
            status: 'suggested',
          }))
        );
        if (pError) toast.error('Event created but failed to add participants');

        // Create activity feed items for each invited friend
        await supabase.from('activity_feed').insert(
          selectedFriends.map(f => ({
            user_id: f.user_id,
            type: 'invitation',
            event_id: event.id,
            source_user_id: user.id,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['unread-activity-count'] });
      toast.success('Plan created! 🎉', {
        description: `${emoji} ${title}${selectedFriends.length > 0 ? ` with ${selectedFriends.map(f => f.username).join(', ')}` : ''}`,
      });
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Plan Something</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label>What are you planning?</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickEmojis.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all',
                    emoji === e ? 'bg-primary/20 scale-110 ring-2 ring-primary/40' : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isMultiDay ? "e.g. Weekend Trip, Camping..." : "e.g. Dinner, Movie Night..."}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMultiDay(!isMultiDay)}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all',
              isMultiDay ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            )}
          >
            🏕️ Multi-day / Trip
          </button>

          {friends.length > 0 && (
            <div className="space-y-2">
              <Label>Who's joining?</Label>
              <div className="flex flex-col gap-2">
                {friends.map(f => {
                  const selected = selectedFriends.find(s => s.user_id === f.user_id);
                  return (
                    <button
                      key={f.user_id}
                      type="button"
                      onClick={() => toggleFriend(f)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl p-3 text-left transition-all border',
                        selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50'
                      )}
                    >
                      <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>
                          {f.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                        {f.bio && (
                          <p className="text-xs text-muted-foreground/80 truncate mt-0.5 italic">"{f.bio}"</p>
                        )}
                      </div>
                      {selected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isMultiDay ? 'Dates' : 'Date & Time'}</Label>
            {isMultiDay ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">End</span>
                  <Input type="date" value={endDateStr} onChange={e => setEndDateStr(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Start time</span>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">End time (optional)</span>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Central Park, Café Bloom..."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any extra details..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full font-semibold"
            size="lg"
          >
            {submitting ? 'Creating...' : 'Create Plan 🚀'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateEventPage;
