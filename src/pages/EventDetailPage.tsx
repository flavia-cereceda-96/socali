import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents, DbEventWithCreator, useFriends, DbProfile } from '@/hooks/useEvents';
import { StatusBadge } from '@/components/StatusBadge';
import { EventComments } from '@/components/EventComments';
import { EventPhotos } from '@/components/EventPhotos';
import { UserAvatar } from '@/components/UserAvatar';
import { ClickableName } from '@/components/ClickableName';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Calendar, MessageSquare, Crown, Pencil, Check, X, UserPlus, UserMinus, Trash2, Link as LinkIcon, Bell, Share2, Shield, ShieldOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';
import { LocationMap } from '@/components/LocationMap';
import { RsvpSheet, RsvpValue } from '@/components/RsvpSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useEvents();
  const { data: friends = [] } = useFriends();
  const event = events.find(e => e.id === id) as DbEventWithCreator | undefined;
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [managingPeople, setManagingPeople] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState<LocationValue>({ address: '', latitude: null, longitude: null });
  const [editNotes, setEditNotes] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeCooldownUntil, setNudgeCooldownUntil] = useState<number>(0);
  const [roleDialog, setRoleDialog] = useState<{ userId: string; username: string; promote: boolean } | null>(null);
  const [rsvpSheetOpen, setRsvpSheetOpen] = useState(false);
  const [rsvpSaving, setRsvpSaving] = useState(false);

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
      setEditLocation({
        address: event.location || '',
        latitude: (event as any).latitude ?? null,
        longitude: (event as any).longitude ?? null,
      });
      setEditNotes(event.notes || '');
      setEditCoverImage((event as any).cover_image || '');
      setEditLinkUrl((event as any).link_url || '');
      setEditLinkLabel((event as any).link_label || '');
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
  const myParticipation = event.participants.find(p => p.user_id === userId);
  const isCoAdmin = (myParticipation as any)?.role === 'co-admin';
  const canManage = isCreator || isCoAdmin;

  const normalizeRsvp = (s: string | undefined | null): RsvpValue => {
    if (s === 'confirmed' || s === 'declined') return s;
    return 'pending';
  };

  const myRsvp: RsvpValue = isCreator
    ? normalizeRsvp((event as any).creator_rsvp || 'confirmed')
    : normalizeRsvp(myParticipation?.status);

  const canEditOwnRsvp = isCreator || !!myParticipation;

  const handleSaveRsvp = async (value: RsvpValue) => {
    if (!event || !userId) return;
    setRsvpSaving(true);
    try {
      if (isCreator) {
        const { error } = await supabase
          .from('events')
          .update({ creator_rsvp: value } as any)
          .eq('id', event.id);
        if (error) { toast.error(error.message); return; }
      } else if (myParticipation) {
        const { error } = await supabase
          .from('event_participants')
          .update({ status: value })
          .eq('id', myParticipation.id);
        if (error) { toast.error(error.message); return; }
      }
      toast.success('RSVP updated');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setRsvpSheetOpen(false);
    } finally {
      setRsvpSaving(false);
    }
  };

  const handleShareInviteLink = async () => {
    if (!event) return;
    try {
      // Look up existing link
      const { data: existing } = await supabase
        .from('event_invite_links')
        .select('token')
        .eq('event_id', event.id)
        .maybeSingle();

      let token = existing?.token as string | undefined;
      if (!token) {
        const { data: created, error } = await supabase
          .from('event_invite_links')
          .insert({ event_id: event.id, created_by: userId! })
          .select('token')
          .single();
        if (error) {
          toast.error(error.message);
          return;
        }
        token = created.token as string;
      }

      const url = `${window.location.origin}/invite/event/${token}`;
      const shareData = {
        title: event.title,
        text: `Join me for ${event.title}`,
        url,
      };

      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // fall through to clipboard
        }
      }

      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch (err: any) {
      toast.error(err.message || 'Could not create invite link');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate link URL
      let normalizedLink: string | null = null;
      if (editLinkUrl.trim()) {
        let candidate = editLinkUrl.trim();
        if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
        try {
          const u = new URL(candidate);
          if (!/^https?:$/.test(u.protocol)) throw new Error();
          normalizedLink = u.toString();
        } catch {
          toast.error('Please enter a valid link URL');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('events')
        .update({
          title: editTitle.trim(),
          date: editDate,
          end_date: editEndDate || null,
          time: editStartTime || null,
          end_time: editEndTime || null,
          location: editLocation.address.trim() || null,
          latitude: editLocation.latitude,
          longitude: editLocation.longitude,
          notes: editNotes.trim() || null,
          cover_image: editCoverImage.trim() || null,
          link_url: normalizedLink,
          link_label: normalizedLink ? (editLinkLabel.trim() || 'Open link') : null,
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

  const handleDelete = async () => {
    if (!event || !window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted');
    queryClient.invalidateQueries({ queryKey: ['events'] });
    navigate('/');
  };

  const handleInviteFriend = async (friend: DbProfile) => {
    if (!event) return;
    const { error } = await supabase.from('event_participants').insert({
      event_id: event.id,
      user_id: friend.user_id,
      status: 'pending',
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from('activity_feed').insert({
      user_id: friend.user_id,
      type: 'invitation',
      event_id: event.id,
      source_user_id: userId,
    });
    toast.success(`Invited @${friend.username}`);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setFriendSearch('');
  };

  const handleRemoveParticipant = async (participantUserId: string) => {
    if (!event) return;
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', event.id)
      .eq('user_id', participantUserId);
    if (error) { toast.error(error.message); return; }
    toast.success('Participant removed');
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleSetRole = async (participantUserId: string, role: 'co-admin' | 'attendee') => {
    if (!event) return;
    const { error } = await supabase
      .from('event_participants')
      .update({ role })
      .eq('event_id', event.id)
      .eq('user_id', participantUserId);
    if (error) { toast.error(error.message); return; }
    toast.success(role === 'co-admin' ? 'Co-admin rights granted' : 'Co-admin rights removed');
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setRoleDialog(null);
  };

  const pendingAttendees = (event?.participants || []).filter(p => p.status === 'pending' || p.status === 'suggested');
  const nudgeOnCooldown = Date.now() < nudgeCooldownUntil;

  const handleSendNudges = async () => {
    if (!event || !userId || pendingAttendees.length === 0) return;
    setNudgeSending(true);
    try {
      const rows = pendingAttendees.map(p => ({
        user_id: p.user_id,
        type: 'rsvp_nudge',
        event_id: event.id,
        source_user_id: userId,
      }));
      const { error } = await supabase.from('activity_feed').insert(rows);
      if (error) { toast.error(error.message); return; }
      toast.success(`Notifications sent to ${rows.length} ${rows.length === 1 ? 'person' : 'people'}`);
      setNudgeCooldownUntil(Date.now() + 5 * 60 * 1000); // 5 min cooldown
      setNudgeOpen(false);
    } finally {
      setNudgeSending(false);
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
      status: normalizeRsvp((event as any).creator_rsvp || 'confirmed'),
      isCreator: true,
      decline_note: null as string | null,
    },
    ...event.participants.map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profile?.username || 'Unknown',
      avatar_url: p.profile?.avatar_url || null,
      status: normalizeRsvp(p.status),
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
          {canManage && !editing && (
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
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Location</span>
              <LocationPicker value={editLocation} onChange={setEditLocation} />
              {editLocation.latitude !== null && editLocation.longitude !== null && (
                <LocationMap
                  latitude={editLocation.latitude}
                  longitude={editLocation.longitude}
                  address={editLocation.address}
                  height={120}
                />
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Cover Image URL</span>
              <Input value={editCoverImage} onChange={e => setEditCoverImage(e.target.value)} placeholder="Paste image URL..." />
              {editCoverImage.trim() && (
                <img src={editCoverImage} alt="Cover preview" className="mt-1 w-full h-24 object-cover rounded-lg" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="space-y-1.5 rounded-xl border border-border bg-secondary/30 p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link (optional)</span>
              <Input
                type="url"
                value={editLinkUrl}
                onChange={e => setEditLinkUrl(e.target.value)}
                placeholder="https://tickets.example.com"
                maxLength={500}
              />
              <Input
                value={editLinkLabel}
                onChange={e => setEditLinkLabel(e.target.value)}
                placeholder='Link text (e.g. "Ticket Site")'
                maxLength={60}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1">
                <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
            {isCreator && event.participants.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin rights</span>
                  <p className="text-xs text-muted-foreground">Co-admins can edit the event and manage attendees, but can't delete it.</p>
                </div>
                <div className="space-y-1.5">
                  {event.participants.map(p => {
                      const isCo = (p as any).role === 'co-admin';
                      return (
                        <div key={p.id} className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5">
                          <UserAvatar username={p.profile?.username || '?'} avatarUrl={p.profile?.avatar_url || null} size="sm" />
                          <span className="flex-1 truncate text-sm font-medium">@{p.profile?.username || 'unknown'}</span>
                          {isCo && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}>
                              Co-admin
                            </span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant={isCo ? 'ghost' : 'outline'}
                            className="h-7 gap-1 text-xs"
                            onClick={() => setRoleDialog({
                              userId: p.user_id,
                              username: p.profile?.username || 'user',
                              promote: !isCo,
                            })}
                          >
                            {isCo ? <><ShieldOff className="h-3 w-3" /> Revoke</> : <><Shield className="h-3 w-3" /> Make co-admin</>}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {isCreator && (
              <Button variant="destructive" onClick={handleDelete} className="w-full gap-1 mt-2">
                <Trash2 className="h-4 w-4" /> Delete Event
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {(event as any).cover_image && (
              <div className="mb-4 rounded-2xl overflow-hidden">
                <img src={(event as any).cover_image} alt="Event cover" className="w-full h-40 object-cover" />
              </div>
            )}
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
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                    <p className="font-medium">{event.location}</p>
                  </div>
                  {(event as any).latitude !== null && (event as any).longitude !== null && (
                    <LocationMap
                      latitude={(event as any).latitude}
                      longitude={(event as any).longitude}
                      address={event.location}
                      height={160}
                    />
                  )}
                </div>
              )}
              {event.notes && (
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
                  <p>{event.notes}</p>
                </div>
              )}
              {(event as any).link_url && (
                <a
                  href={(event as any).link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm font-medium text-primary underline-offset-4 hover:underline break-all"
                >
                  <LinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{(event as any).link_label || (event as any).link_url}</span>
                </a>
              )}
            </motion.div>
          </>
        )}

        {/* Attendees */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Attendees ({attendees.length})
            </h2>
            {canManage && pendingAttendees.length > 0 && (
              <button
                onClick={() => setNudgeOpen(true)}
                disabled={nudgeOnCooldown}
                title={nudgeOnCooldown ? 'Recently sent — try again in a few minutes' : 'Nudge pending RSVPs'}
                className="rounded-full p-1.5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Bell className="h-4 w-4" />
              </button>
            )}
          </div>
          {canManage && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">Legend:</span>
              {isCreator && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Make co-admin
                </span>
              )}
              {isCreator && (
                <span className="flex items-center gap-1">
                  <ShieldOff className="h-3 w-3" /> Revoke co-admin
                </span>
              )}
              <span className="flex items-center gap-1">
                <UserMinus className="h-3 w-3" /> Remove attendee
              </span>
              {pendingAttendees.length > 0 && (
                <span className="flex items-center gap-1">
                  <Bell className="h-3 w-3" /> Nudge pending RSVPs
                </span>
              )}
            </div>
          )}
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
                  <button
                    onClick={() => navigate(`/person/${a.user_id}`)}
                    aria-label={`View @${a.username}`}
                  >
                    <UserAvatar avatarUrl={a.avatar_url} username={a.username} size="md" />
                  </button>
                  <ClickableName userId={a.user_id} name={a.username} className="flex-1" />
                  <div className="flex items-center gap-2">
                    {a.isCreator && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Crown className="h-3 w-3" /> Organizer
                      </span>
                    )}
                    {!a.isCreator && (a as any).role === 'co-admin' && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}
                      >
                        <Shield className="h-3 w-3" /> Co-admin
                      </span>
                    )}
                    {a.user_id === userId ? (
                      <button
                        onClick={() => setRsvpSheetOpen(true)}
                        className="rounded-full transition-transform hover:scale-105 active:scale-95"
                        title="Tap to update your RSVP"
                      >
                        <StatusBadge status={a.status as any} size="md" />
                      </button>
                    ) : (
                      <StatusBadge status={a.status as any} size="md" />
                    )}
                    {isCreator && !a.isCreator && (
                      <button
                        onClick={() => setRoleDialog({
                          userId: a.user_id,
                          username: a.username,
                          promote: (a as any).role !== 'co-admin',
                        })}
                        className="rounded-full p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={(a as any).role === 'co-admin' ? 'Remove admin rights' : 'Make co-admin'}
                      >
                        {(a as any).role === 'co-admin'
                          ? <ShieldOff className="h-3.5 w-3.5" />
                          : <Shield className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {canManage && !a.isCreator && (a as any).role !== 'co-admin' && (
                        <button
                          onClick={() => handleRemoveParticipant(a.user_id)}
                          className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove participant"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                  </div>
                </div>
                {a.status === 'declined' && a.decline_note && (
                  <p className="mt-2 ml-13 text-xs text-muted-foreground italic pl-[52px]">
                    "{a.decline_note}"
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Invite friends - organizer only */}
          {canManage && (
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setManagingPeople(!managingPeople)}
                className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" /> Invite more people
              </button>
              <button
                onClick={handleShareInviteLink}
                className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <Share2 className="h-3.5 w-3.5" /> Share invite link
              </button>
              {managingPeople && (
                <div className="space-y-2">
                  <Input
                    value={friendSearch}
                    onChange={e => setFriendSearch(e.target.value)}
                    placeholder="@username to search friends..."
                    className="text-sm"
                  />
                  {friendSearch.length > 0 && (() => {
                    const query = friendSearch.startsWith('@') ? friendSearch.slice(1).toLowerCase() : friendSearch.toLowerCase();
                    const existingUserIds = new Set(attendees.map(a => a.user_id));
                    const filtered = friends.filter(f =>
                      !existingUserIds.has(f.user_id) &&
                      (f.username.toLowerCase().includes(query) || f.email.toLowerCase().includes(query))
                    );
                    return filtered.length > 0 ? (
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1">
                        {filtered.map(f => (
                          <button
                            key={f.user_id}
                            type="button"
                            onClick={() => handleInviteFriend(f)}
                            className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-secondary/50"
                          >
                            <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">@{f.username}</p>
                              <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                              {f.bio && <p className="text-xs text-muted-foreground/80 truncate mt-0.5 italic">"{f.bio}"</p>}
                            </div>
                            <UserPlus className="h-4 w-4 text-primary" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No matching friends found</p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
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

      <AlertDialog open={nudgeOpen} onOpenChange={setNudgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notify pending RSVPs</AlertDialogTitle>
            <AlertDialogDescription>
              An email will be sent to these users asking them to confirm their invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-secondary/40 p-3 text-sm text-foreground">
            {pendingAttendees.map(p => (
              <li key={p.id} className="py-0.5">
                @{p.profile?.username ?? 'unknown'}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={nudgeSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSendNudges(); }}
              disabled={nudgeSending}
            >
              {nudgeSending ? 'Sending...' : 'Send notification'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleDialog?.promote
                ? `Give @${roleDialog?.username} admin rights to this event?`
                : `Remove @${roleDialog?.username}'s admin rights?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleDialog?.promote
                ? "Co-admins can edit the event and manage attendees, but can't delete it."
                : "They'll go back to being a regular attendee."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (roleDialog) handleSetRole(roleDialog.userId, roleDialog.promote ? 'co-admin' : 'attendee');
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RsvpSheet
        open={rsvpSheetOpen && canEditOwnRsvp}
        onOpenChange={setRsvpSheetOpen}
        current={myRsvp}
        onSave={handleSaveRsvp}
        saving={rsvpSaving}
      />
    </div>
  );
};

export default EventDetailPage;
