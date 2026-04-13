import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents, DbEventWithCreator } from '@/hooks/useEvents';
import { StatusBadge } from '@/components/StatusBadge';
import { EventComments } from '@/components/EventComments';
import { EventPhotos } from '@/components/EventPhotos';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Calendar, MessageSquare, Crown, Pencil, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useEvents();
  const event = events.find(e => e.id === id) as DbEventWithCreator | undefined;
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDate(event.date);
      setEditEndDate(event.end_date || '');
      setEditStartTime((event as any).time || '');
      setEditEndTime((event as any).end_time || '');
      setEditLocation(event.location || '');
      setEditNotes(event.notes || '');
    }
  }, [event]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const isCreator = userId === event.created_by;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editTitle.trim(),
          date: editDate,
          end_date: editEndDate || null,
          time: editStartTime || null,
          end_time: editEndTime || null,
          location: editLocation.trim() || null,
          notes: editNotes.trim() || null,
        })
        .eq('id', event.id);

      if (error) { toast.error(error.message); return; }
      toast.success('Event updated! ✨');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dateStr = event.end_date
    ? `${fmt(event.date)} – ${fmt(event.end_date)}`
    : fmt(event.date);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const timeStr = (() => {
    const start = (event as any).time;
    const end = (event as any).end_time;
    if (!start) return null;
    if (end) return `${formatTime(start)} – ${formatTime(end)}`;
    return formatTime(start);
  })();

  // Build attendees list
  const attendees = [
    {
      id: 'creator',
      user_id: event.created_by,
      username: event.creator_profile?.username || 'Unknown',
      avatar_url: event.creator_profile?.avatar_url || null,
      status: 'organizer' as const,
      isCreator: true,
      decline_note: null as string | null,
    },
    ...event.participants.map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profile?.username || 'Unknown',
      avatar_url: p.profile?.avatar_url || null,
      status: p.status,
      isCreator: false,
      decline_note: (p as any).decline_note || null,
    })),
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-3xl">{event.emoji}</span>
          <motion.h1
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 text-2xl font-bold text-foreground"
          >
            {event.title}
          </motion.h1>
          {isCreator && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {editing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl bg-card p-5 shadow-card space-y-4"
          >
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Start date</span>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">End date</span>
                <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Start time</span>
                <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">End time</span>
                <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Location</span>
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
                <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4 rounded-2xl bg-card p-5 shadow-card space-y-4"
          >
            <div className="flex items-center gap-3 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{dateStr}</span>
            </div>
            {timeStr && (
              <div className="flex items-center gap-3 text-sm text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>{timeStr}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-start gap-3 text-sm text-foreground">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <p className="font-medium">{event.location}</p>
              </div>
            )}
            {event.notes && (
              <div className="flex items-start gap-3 text-sm text-foreground">
                <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
                <p>{event.notes}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Attendees */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attendees ({attendees.length})
          </h2>
          <div className="flex flex-col gap-2">
            {attendees.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="rounded-2xl bg-card p-3 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar avatarUrl={a.avatar_url} username={a.username} size="md" />
                  <span className="flex-1 font-medium text-foreground">
                    {a.username}
                  </span>
                  {a.isCreator ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <Crown className="h-3 w-3" /> Organizer
                    </span>
                  ) : (
                    <StatusBadge status={a.status as any} size="md" />
                  )}
                </div>
                {a.status === 'declined' && a.decline_note && (
                  <p className="mt-2 ml-13 text-xs text-muted-foreground italic pl-[52px]">
                    "{a.decline_note}"
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Photos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <EventPhotos eventId={event.id} />
        </motion.div>

        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <EventComments eventId={event.id} />
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetailPage;
