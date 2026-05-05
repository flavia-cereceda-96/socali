import { useState, useEffect } from 'react';
import { useFriends, DbProfile } from '@/hooks/useEvents';
import { useGroups, useGroup, DbGroup } from '@/hooks/useGroups';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X, Users, Shield, Plus, CalendarClock, Smile } from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';
import { LocationMap } from '@/components/LocationMap';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const routeLocation = useLocation();
  const prefilledDate = searchParams.get('date') || '';
  const prefilledGroupId = searchParams.get('groupId') || '';
  const prefilledTitle = searchParams.get('title') || '';
  const prefilledEmoji = searchParams.get('emoji') || '';
  const bucketItemId = searchParams.get('bucketItemId') || '';
  const { data: friends = [] } = useFriends();
  const { data: groups = [] } = useGroups();
  const { data: prefilledGroup } = useGroup(prefilledGroupId || undefined);

  // Pre-invite a friend if navigated from PersonPage
  const inviteFriendId = (routeLocation.state as any)?.inviteFriendId;
  const inviteFriendName = (routeLocation.state as any)?.inviteFriendName;
  const inviteGroupIdFromState = (routeLocation.state as any)?.inviteGroupId;

  const [title, setTitle] = useState(prefilledTitle);
  const [emoji, setEmoji] = useState(prefilledEmoji || '🎉');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<DbProfile[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<DbGroup[]>([]);
  const [dateStr, setDateStr] = useState(prefilledDate);
  const [endDateStr, setEndDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState<LocationValue>({ address: '', latitude: null, longitude: null });
  const [notes, setNotes] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [coAdminIds, setCoAdminIds] = useState<Set<string>>(new Set());

  // Date poll state
  const [datePoll, setDatePoll] = useState(false);
  type DateOption = { proposed_date: string; start_time: string; end_time: string };
  const [dateOptions, setDateOptions] = useState<DateOption[]>([
    { proposed_date: '', start_time: '', end_time: '' },
    { proposed_date: '', start_time: '', end_time: '' },
  ]);
  const [pollDeadline, setPollDeadline] = useState('');

  // What poll state
  type WhatOption = { title: string; link: string };
  const [whatPoll, setWhatPoll] = useState(false);
  const [whatOptions, setWhatOptions] = useState<WhatOption[]>([
    { title: '', link: '' },
    { title: '', link: '' },
  ]);
  const updateWhatOption = (i: number, patch: Partial<WhatOption>) => {
    setWhatOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };
  const addWhatOption = () => {
    if (whatOptions.length >= 8) return;
    setWhatOptions(prev => [...prev, { title: '', link: '' }]);
  };
  const removeWhatOption = (i: number) => {
    setWhatOptions(prev => prev.filter((_, idx) => idx !== i));
  };
  const validWhatOptions = whatOptions.filter(o => o.title.trim());

  const updateDateOption = (i: number, patch: Partial<DateOption>) => {
    setDateOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };
  const addDateOption = () => {
    if (dateOptions.length >= 6) return;
    setDateOptions(prev => [...prev, { proposed_date: '', start_time: '', end_time: '' }]);
  };
  const removeDateOption = (i: number) => {
    setDateOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleCoAdmin = (userId: string) => {
    setCoAdminIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  // Auto-select friend if navigated from PersonPage
  useEffect(() => {
    if (inviteFriendId && friends.length > 0) {
      const friend = friends.find(f => f.user_id === inviteFriendId);
      if (friend && !selectedFriends.find(f => f.user_id === inviteFriendId)) {
        setSelectedFriends(prev => [...prev, friend]);
      }
    }
  }, [inviteFriendId, friends]);

  // Auto-select group if navigated with ?groupId
  useEffect(() => {
    if (prefilledGroup && !selectedGroups.find(g => g.id === prefilledGroup.id)) {
      setSelectedGroups(prev => [...prev, {
        id: prefilledGroup.id,
        name: prefilledGroup.name,
        emoji: prefilledGroup.emoji,
        created_by: prefilledGroup.created_by,
        created_at: prefilledGroup.created_at,
        member_count: prefilledGroup.member_count,
      }]);
    }
  }, [prefilledGroup]);

  // Auto-select group if navigated from group bucket list
  const { data: bucketGroup } = useGroup(inviteGroupIdFromState || undefined);
  useEffect(() => {
    if (bucketGroup && !selectedGroups.find(g => g.id === bucketGroup.id)) {
      setSelectedGroups(prev => [...prev, {
        id: bucketGroup.id,
        name: bucketGroup.name,
        emoji: bucketGroup.emoji,
        created_by: bucketGroup.created_by,
        created_at: bucketGroup.created_at,
        member_count: bucketGroup.member_count,
      }]);
    }
  }, [bucketGroup]);

  const toggleFriend = (f: DbProfile) => {
    setSelectedFriends(prev =>
      prev.find(p => p.user_id === f.user_id) ? prev.filter(p => p.user_id !== f.user_id) : [...prev, f]
    );
  };

  const toggleGroup = (g: DbGroup) => {
    setSelectedGroups(prev =>
      prev.find(p => p.id === g.id) ? prev.filter(p => p.id !== g.id) : [...prev, g]
    );
  };

  const validPollOptions = dateOptions.filter(o => o.proposed_date);
  const canSubmit = datePoll
    ? !!title.trim() && validPollOptions.length >= 2
    : !!title.trim() && !!dateStr && (isMultiDay ? !!endDateStr : !!startTime);

  /** Resolve final unique participant user_ids from friends + groups (excluding current user). */
  async function resolveParticipants(currentUserId: string): Promise<string[]> {
    const ids = new Set<string>(selectedFriends.map(f => f.user_id));
    if (selectedGroups.length > 0) {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', selectedGroups.map(g => g.id))
        .eq('membership_status', 'accepted');
      (members || []).forEach(m => {
        if (m.user_id !== currentUserId) ids.add(m.user_id);
      });
    }
    return Array.from(ids);
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Validate link URL if provided
      let normalizedLink: string | null = null;
      if (linkUrl.trim()) {
        let candidate = linkUrl.trim();
        if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
        try {
          const u = new URL(candidate);
          if (!/^https?:$/.test(u.protocol)) throw new Error();
          normalizedLink = u.toString();
        } catch {
          toast.error('Please enter a valid link URL');
          setSubmitting(false);
          return;
        }
      }

      const { data: event, error } = await supabase.from('events').insert({
        title,
        emoji,
        date: datePoll ? null : dateStr,
        end_date: !datePoll && isMultiDay ? endDateStr : null,
        time: !datePoll && !isMultiDay ? (startTime || null) : null,
        end_time: !datePoll && !isMultiDay ? (endTime || null) : null,
        date_confirmed: !datePoll,
        poll_deadline: datePoll && pollDeadline ? pollDeadline : null,
        location: location.address.trim() || null,
        latitude: location.latitude,
        longitude: location.longitude,
        notes: notes || null,
        cover_image: coverImage.trim() || null,
        link_url: normalizedLink,
        link_label: normalizedLink ? (linkLabel.trim() || 'Open link') : null,
        is_trip: !datePoll && isMultiDay,
        created_by: user.id,
      } as any).select().single();

      if (error) {
        toast.error(error.message);
        return;
      }

      // Insert date options if poll is enabled
      if (datePoll && event && validPollOptions.length > 0) {
        const { error: optErr } = await supabase.from('event_date_options').insert(
          validPollOptions.map(o => ({
            event_id: event.id,
            proposed_date: o.proposed_date,
            start_time: o.start_time || null,
            end_time: o.end_time || null,
          }))
        );
        if (optErr) toast.error('Event created but failed to add poll options');
      }

      // Insert what options if what poll is enabled
      if (whatPoll && event && validWhatOptions.length > 0) {
        const { error: woErr } = await (supabase as any).from('event_what_options').insert(
          validWhatOptions.map(o => {
            let normLink: string | null = null;
            if (o.link.trim()) {
              let candidate = o.link.trim();
              if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
              try { normLink = new URL(candidate).toString(); } catch { normLink = null; }
            }
            return {
              event_id: event.id,
              title: o.title.trim(),
              link: normLink,
              suggested_by: user.id,
            };
          })
        );
        if (woErr) toast.error('Event created but failed to add activity options');
      }

      // Resolve final participants from friends + groups (deduped, excludes creator)
      const participantIds = await resolveParticipants(user.id);

      if (participantIds.length > 0 && event) {
        const { error: pError } = await supabase.from('event_participants').insert(
          participantIds.map(uid => ({
            event_id: event.id,
            user_id: uid,
            status: 'pending',
            role: coAdminIds.has(uid) ? 'co-admin' : 'attendee',
          }))
        );
        if (pError) toast.error('Event created but failed to add participants');

        await supabase.from('activity_feed').insert(
          participantIds.map(uid => ({
            user_id: uid,
            type: datePoll ? 'date_poll_invite' : 'invitation',
            event_id: event.id,
            source_user_id: user.id,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['unread-activity-count'] });

      // Link bucket list item to the new event if applicable
      if (bucketItemId && event) {
        await (supabase as any)
          .from('bucket_list_items')
          .update({ linked_event_id: event.id })
          .eq('id', bucketItemId);
        queryClient.invalidateQueries({ queryKey: ['bucket-list-items'] });
        queryClient.invalidateQueries({ queryKey: ['my-bucket-lists'] });
      }

      const peopleSummary = selectedGroups.length > 0
        ? selectedGroups.map(g => `${g.emoji} ${g.name}`).join(', ')
        : selectedFriends.map(f => f.username).join(', ');
      toast.success('Plan created! 🎉', {
        description: `${emoji} ${title}${peopleSummary ? ` with ${peopleSummary}` : ''}`,
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
            <Label>What are you planning? *</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl hover:bg-secondary/80 transition-colors"
                    aria-label="Pick emoji"
                  >
                    {emoji || <Smile className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-0 p-0" align="start">
                  <EmojiPicker
                    onEmojiClick={(d) => setEmoji(d.emoji)}
                    emojiStyle={EmojiStyle.NATIVE}
                    width={320}
                    height={400}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                </PopoverContent>
              </Popover>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={isMultiDay ? "e.g. Weekend Trip, Camping..." : "e.g. Dinner, Movie Night..."}
              />
            </div>

            {/* Not sure what — what poll toggle */}
            <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-3 mt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {whatPoll ? 'Activity options' : 'Not sure what to do?'}
                </Label>
                <button
                  type="button"
                  onClick={() => setWhatPoll(p => !p)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    whatPoll ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  )}
                >
                  {whatPoll ? 'Poll on' : 'Create a what poll'}
                </button>
              </div>
              {whatPoll && (
                <div className="space-y-2">
                  {whatOptions.map((opt, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">Option {i + 1}</span>
                        {whatOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeWhatOption(i)}
                            className="ml-auto text-muted-foreground hover:text-destructive p-1"
                            aria-label="Remove option"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <Input
                        value={opt.title}
                        onChange={e => updateWhatOption(i, { title: e.target.value })}
                        placeholder="e.g. Dinner at Café Bloom"
                      />
                      <Input
                        value={opt.link}
                        onChange={e => updateWhatOption(i, { link: e.target.value })}
                        placeholder="Optional link (https://…)"
                      />
                    </div>
                  ))}
                  {whatOptions.length < 8 && (
                    <Button type="button" size="sm" variant="outline" className="w-full gap-1.5" onClick={addWhatOption}>
                      <Plus className="h-3.5 w-3.5" /> Add option
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Attendees can vote and suggest more options. You'll pick the winner.
                  </p>
                </div>
              )}
            </div>
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

          <div className="space-y-2">
            <Label>Who's joining?</Label>
            {(selectedFriends.length > 0 || selectedGroups.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedGroups.map(g => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent border border-primary/30 px-2.5 py-1 text-xs font-semibold text-foreground"
                  >
                    <span className="text-base leading-none">{g.emoji}</span>
                    {g.name}
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      ×{g.member_count}
                    </span>
                    <button type="button" onClick={() => toggleGroup(g)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedFriends.map(f => (
                  <span
                    key={f.user_id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="sm" />
                    @{f.username}
                    <button type="button" onClick={() => toggleFriend(f)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)}
              placeholder="Search friends or groups..."
            />
            {friendSearch.length > 0 && (() => {
              const query = friendSearch.startsWith('@') ? friendSearch.slice(1).toLowerCase() : friendSearch.toLowerCase();
              const filteredFriends = friends.filter(f =>
                !selectedFriends.find(s => s.user_id === f.user_id) &&
                (f.username.toLowerCase().includes(query) || f.email.toLowerCase().includes(query))
              );
              const filteredGroups = groups.filter(g =>
                !selectedGroups.find(s => s.id === g.id) &&
                g.name.toLowerCase().includes(query)
              );
              if (filteredFriends.length === 0 && filteredGroups.length === 0) {
                return <p className="text-xs text-muted-foreground mt-1">No matching friends or groups</p>;
              }
              return (
                <div className="flex flex-col gap-1 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1">
                  {filteredGroups.length > 0 && (
                    <>
                      <p className="px-2.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Groups
                      </p>
                      {filteredGroups.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { toggleGroup(g); setFriendSearch(''); }}
                          className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-secondary/50"
                        >
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
                            {g.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {g.member_count} member{g.member_count === 1 ? '' : 's'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredFriends.length > 0 && (
                    <>
                      <p className="px-2.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Friends
                      </p>
                      {filteredFriends.map(f => (
                        <button
                          key={f.user_id}
                          type="button"
                          onClick={() => { toggleFriend(f); setFriendSearch(''); }}
                          className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-secondary/50"
                        >
                          <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">@{f.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                            {f.bio && (
                              <p className="text-xs text-muted-foreground/80 truncate mt-0.5 italic">"{f.bio}"</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {selectedFriends.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Give admin rights (optional)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Co-admins can edit the event and manage attendees, but can't delete it.
              </p>
              <div className="flex flex-col gap-1.5">
                {selectedFriends.map(f => {
                  const on = coAdminIds.has(f.user_id);
                  return (
                    <button
                      key={f.user_id}
                      type="button"
                      onClick={() => toggleCoAdmin(f.user_id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-2 text-left transition-all',
                        on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-secondary/50'
                      )}
                    >
                      <UserAvatar avatarUrl={f.avatar_url} username={f.username} size="sm" />
                      <span className="flex-1 text-sm font-medium text-foreground">@{f.username}</span>
                      <span
                        className={cn(
                          'flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
                          on ? 'bg-primary justify-end' : 'bg-muted justify-start'
                        )}
                      >
                        <span className="h-4 w-4 rounded-full bg-background shadow" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {datePoll ? 'Date options *' : isMultiDay ? 'Dates *' : 'Date & Time *'}
              </Label>
              <button
                type="button"
                onClick={() => setDatePoll(p => !p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                  datePoll ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {datePoll ? 'Poll on' : 'Not sure when?'}
              </button>
            </div>
            {datePoll ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Add 2–6 dates and let attendees vote. You can confirm a final date later.
                </p>
                <div className="space-y-2">
                  {dateOptions.map((opt, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground w-6">#{i + 1}</span>
                        <Input
                          type="date"
                          value={opt.proposed_date}
                          onChange={e => updateDateOption(i, { proposed_date: e.target.value })}
                          className="flex-1"
                        />
                        {dateOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeDateOption(i)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove option"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Start (optional)</span>
                          <Input type="time" value={opt.start_time} onChange={e => updateDateOption(i, { start_time: e.target.value })} />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">End (optional)</span>
                          <Input type="time" value={opt.end_time} onChange={e => updateDateOption(i, { end_time: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {dateOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addDateOption}
                    className="w-full gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add date option
                  </Button>
                )}
                <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Voting deadline (optional)
                  </Label>
                  <Input type="date" value={pollDeadline} onChange={e => setPollDeadline(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    Voting will close on this date.
                  </p>
                </div>
              </div>
            ) : isMultiDay ? (
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
            <LocationPicker
              value={location}
              onChange={setLocation}
              placeholder="e.g. Central Park, Café Bloom..."
            />
            {location.latitude !== null && location.longitude !== null && (
              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
                address={location.address}
                height={140}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Cover Image URL (optional)</Label>
            <Input
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="Paste an image URL..."
            />
            {coverImage.trim() && (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
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

          <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add a link (optional)
            </Label>
            <Input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://tickets.example.com"
              maxLength={500}
              type="url"
            />
            <Input
              value={linkLabel}
              onChange={e => setLinkLabel(e.target.value)}
              placeholder='Link text (e.g. "Ticket Site")'
              maxLength={60}
            />
            <p className="text-[11px] text-muted-foreground">
              People will see this as a clickable link on the event page.
            </p>
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
