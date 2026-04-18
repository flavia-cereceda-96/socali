import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents, DbEvent, DbEventWithCreator } from '@/hooks/useEvents';
import { useActivityFeed, ActivityItem } from '@/hooks/useActivity';
import { StatusBadge } from '@/components/StatusBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { MapPin, Clock, Check, HelpCircle, X, MessageSquare, UserPlus, AtSign, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { autoExportToGCalIfEnabled } from '@/lib/autoExportGCal';

const RequestsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: activities = [], isLoading: activitiesLoading } = useActivityFeed();
  const [userId, setUserId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  // Mark activities as read when page is viewed
  useEffect(() => {
    const unreadIds = activities.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length > 0) {
      supabase
        .from('activity_feed')
        .update({ is_read: true })
        .in('id', unreadIds)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['unread-activity-count'] });
        });
    }
  }, [activities, queryClient]);

  // Events where the current user is a participant with 'suggested' status
  const pendingInvitations = events.filter(e =>
    e.created_by !== userId && e.participants.some(p => p.user_id === userId && p.status === 'suggested')
  );

  const handleRsvp = async (participantId: string, status: string, note?: string, event?: DbEvent) => {
    const updateData: any = { status };
    if (status === 'declined' && note) {
      updateData.decline_note = note;
    }
    const { error } = await supabase
      .from('event_participants')
      .update(updateData)
      .eq('id', participantId);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['unread-activity-count'] });
      if (status === 'confirmed' && event) {
        autoExportToGCalIfEnabled({
          title: event.title,
          emoji: event.emoji,
          date: event.date,
          end_date: event.end_date,
          time: event.time,
          end_time: event.end_time,
          location: event.location,
          notes: event.notes,
        });
      }
    }
    setDecliningId(null);
    setDeclineNote('');
  };

  const isLoading = eventsLoading || activitiesLoading;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invitation': return <UserPlus className="h-4 w-4 text-primary" />;
      case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'mention': return <AtSign className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (item: ActivityItem) => {
    const name = item.source_profile?.username || 'Someone';
    const eventTitle = item.event?.title || 'an event';
    switch (item.type) {
      case 'invitation':
        return <><span className="font-semibold">{name}</span> invited you to <span className="font-semibold">{eventTitle}</span></>;
      case 'comment':
        return <><span className="font-semibold">{name}</span> commented on <span className="font-semibold">{eventTitle}</span></>;
      case 'mention':
        return <><span className="font-semibold">{name}</span> mentioned you in <span className="font-semibold">{eventTitle}</span></>;
      default:
        return <><span className="font-semibold">{name}</span> activity on <span className="font-semibold">{eventTitle}</span></>;
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          New Activity
        </motion.h1>

        {/* Pending invitations that need action */}
        {pendingInvitations.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Your Response ({pendingInvitations.length})
            </h2>
            <div className="mb-6 flex flex-col gap-3">
              {pendingInvitations.map((event, i) => {
                const myP = event.participants.find(p => p.user_id === userId);
                if (!myP) return null;
                const ev = event as DbEventWithCreator;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-2xl bg-card p-4 shadow-card"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{event.emoji}</span>
                        <div>
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          {ev.creator_profile && (
                            <p className="text-xs text-muted-foreground">by {ev.creator_profile.username}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status="suggested" />
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {event.time && ` · ${event.time}`}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{event.location}
                        </span>
                      )}
                    </div>

                    {decliningId === myP.id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Add a note (optional) e.g. Sorry, busy that day!"
                          value={declineNote}
                          onChange={e => setDeclineNote(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRsvp(myP.id, 'declined', declineNote, event)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRsvp(myP.id, 'declined', declineNote, event)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-4 w-4" /> Confirm Decline
                          </button>
                          <button
                            onClick={() => { setDecliningId(null); setDeclineNote(''); }}
                            className="flex items-center justify-center gap-1 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRsvp(myP.id, 'confirmed', undefined, event)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-green-500/10 hover:text-green-600"
                        >
                          <Check className="h-4 w-4" /> Going
                        </button>
                        <button
                          onClick={() => handleRsvp(myP.id, 'maybe', undefined, event)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-amber-500/10 hover:text-amber-600"
                        >
                          <HelpCircle className="h-4 w-4" /> Maybe
                        </button>
                        <button
                          onClick={() => setDecliningId(myP.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" /> Decline
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Activity feed */}
        {activities.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </h2>
            <div className="flex flex-col gap-2">
              {activities.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => item.event_id && navigate(`/event/${item.event_id}`)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl bg-card p-3 shadow-card cursor-pointer transition-colors hover:bg-secondary/50',
                    !item.is_read && 'ring-1 ring-primary/20'
                  )}
                >
                  <UserAvatar
                    avatarUrl={item.source_profile?.avatar_url}
                    username={item.source_profile?.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getActivityIcon(item.type)}
                      <p className="text-sm text-foreground leading-snug">
                        {getActivityText(item)}
                      </p>
                    </div>
                    {item.comment_content && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        "{item.comment_content}"
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</p>
                  </div>
                  {!item.is_read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}

        {pendingInvitations.length === 0 && activities.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No new activity yet ✨</p>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
