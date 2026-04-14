import { useState, useMemo, useRef, useEffect } from 'react';
import { useEvents, useFriends, DbEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Clock } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FRIEND_COLORS = [
  'bg-blue-500', 'bg-rose-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-violet-500', 'bg-cyan-500',
];
const FRIEND_TEXT_COLORS = [
  'text-blue-600', 'text-rose-600', 'text-emerald-600',
  'text-amber-600', 'text-violet-600', 'text-cyan-600',
];
const FRIEND_BG_COLORS = [
  'bg-blue-100', 'bg-rose-100', 'bg-emerald-100',
  'bg-amber-100', 'bg-violet-100', 'bg-cyan-100',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDateInRange(date: Date, startStr: string, endStr?: string | null) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(startStr + 'T00:00:00').getTime();
  if (!endStr) return d === s;
  const e = new Date(endStr + 'T00:00:00').getTime();
  return d >= s && d <= e;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Generate N weeks from a start week
function generateWeeks(centerDate: Date, weeksBefore: number, weeksAfter: number) {
  const center = getWeekStart(centerDate);
  const weeks: Date[] = [];
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const ws = new Date(center);
    ws.setDate(ws.getDate() + i * 7);
    weeks.push(ws);
  }
  return weeks;
}

interface FriendEvent {
  id: string;
  date: string;
  end_date: string | null;
  title: string;
  emoji: string;
  friendUserId: string;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const { data: friends = [] } = useFriends();
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate weeks: 26 weeks before and after (about 6 months each way)
  const weeks = useMemo(() => generateWeeks(today, 26, 26), []);

  // Scroll to current week on mount
  useEffect(() => {
    setTimeout(() => {
      currentWeekRef.current?.scrollIntoView({ block: 'start' });
    }, 100);
  }, []);

  // Fetch friend events when friends are selected
  const { data: friendEvents = [] } = useQuery({
    queryKey: ['friend-events', selectedFriends.join(',')],
    queryFn: async () => {
      if (selectedFriends.length === 0) return [];
      const allFriendEvents: FriendEvent[] = [];

      for (const fId of selectedFriends) {
        // Events they created
        const { data: created } = await supabase
          .from('events')
          .select('id, date, end_date, title, emoji')
          .eq('created_by', fId);

        (created || []).forEach(e => allFriendEvents.push({ ...e, friendUserId: fId }));

        // Events they're participating in
        const { data: parts } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', fId);

        if (parts && parts.length > 0) {
          const { data: partEvents } = await supabase
            .from('events')
            .select('id, date, end_date, title, emoji')
            .in('id', parts.map(p => p.event_id));

          (partEvents || []).forEach(e => {
            if (!allFriendEvents.find(fe => fe.id === e.id && fe.friendUserId === fId)) {
              allFriendEvents.push({ ...e, friendUserId: fId });
            }
          });
        }
      }
      return allFriendEvents;
    },
    enabled: selectedFriends.length > 0,
  });

  const getEventsForDate = (date: Date) =>
    events.filter(e => isDateInRange(date, e.date, e.end_date));

  const getFriendEventsForDate = (date: Date) =>
    friendEvents.filter(e => isDateInRange(date, e.date, e.end_date));

  const filteredFriends = useMemo(() => {
    const atIndex = query.lastIndexOf('@');
    if (atIndex === -1) return [];
    const search = query.slice(atIndex + 1).toLowerCase();
    return friends.filter(
      f => !selectedFriends.includes(f.user_id) && f.username.toLowerCase().includes(search)
    );
  }, [query, selectedFriends, friends]);

  const selectFriend = (userId: string) => {
    setSelectedFriends(prev => [...prev, userId]);
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeFriend = (userId: string) => {
    setSelectedFriends(prev => prev.filter(f => f !== userId));
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(value.includes('@'));
  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const renderEventCard = (event: DbEvent, i: number) => (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      onClick={() => navigate(`/event/${event.id}`)}
      className="flex gap-3 rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-shadow hover:shadow-elevated active:scale-[0.99]"
    >
      <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2 min-w-[52px]">
        <span className="text-xs font-semibold uppercase text-primary">
          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}
        </span>
        <span className="text-lg font-bold text-primary">
          {new Date(event.date).getDate()}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{event.emoji}</span>
          <span className="font-semibold text-foreground truncate">{event.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {event.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>}
          {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>}
        </div>
      </div>
    </motion.div>
  );

  const getFriendColorIndex = (friendId: string) => {
    const idx = selectedFriends.indexOf(friendId);
    return idx >= 0 ? idx % FRIEND_COLORS.length : 0;
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Calendar</h1>

          {/* @-mention input */}
          <div className="relative mb-3">
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onFocus={() => { if (query.includes('@')) setShowDropdown(true); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Type @name to check availability..."
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <AnimatePresence>
              {showDropdown && filteredFriends.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
                >
                  {filteredFriends.map(friend => (
                    <button
                      key={friend.user_id}
                      onMouseDown={e => { e.preventDefault(); selectFriend(friend.user_id); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <UserAvatar avatarUrl={friend.avatar_url} username={friend.username} size="sm" />
                      <span>{friend.username}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected friend pills */}
          {selectedFriends.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFriends.map((fId, idx) => {
                const friend = friends.find(f => f.user_id === fId);
                return (
                  <span key={fId} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">
                    <UserAvatar avatarUrl={friend?.avatar_url} username={friend?.username} size="sm" />
                    {friend?.username || 'Unknown'}
                    <span className={cn('h-2 w-2 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])} />
                    <button onClick={() => removeFriend(fId)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground sticky top-0 bg-background z-10 py-1">
          {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Scrollable calendar grid */}
        <div
          ref={scrollContainerRef}
          className="max-h-[50vh] overflow-y-auto scrollbar-thin"
        >
          {weeks.map((weekStart, wi) => {
            const days = getWeekDays(weekStart);
            const isCurrentWeek = days.some(d => isSameDay(d, today));
            return (
              <div
                key={weekStart.toISOString()}
                ref={isCurrentWeek ? currentWeekRef : undefined}
                className="grid grid-cols-7 gap-0.5 mb-0.5"
              >
                {days.map((date, di) => {
                  const isToday = isSameDay(date, today);
                  const myEvents = getEventsForDate(date);
                  const fEvents = getFriendEventsForDate(date);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

                  return (
                    <button
                      key={di}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        'relative flex flex-col items-start p-1 min-h-[56px] rounded-lg text-left transition-all overflow-hidden',
                        isSelected ? 'bg-primary/15 ring-1 ring-primary' :
                        isToday ? 'bg-primary/10' :
                        'hover:bg-secondary/50',
                        !isCurrentMonth && 'opacity-50'
                      )}
                    >
                      <span className={cn(
                        'text-[11px] font-medium leading-none mb-0.5',
                        isToday ? 'text-primary font-bold' :
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {date.getDate() === 1 ? `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}` : date.getDate()}
                      </span>
                      {/* My events */}
                      {myEvents.slice(0, 2).map(e => (
                        <div key={e.id} className="w-full truncate text-[9px] leading-tight rounded px-0.5 bg-primary/15 text-primary font-medium mb-px">
                          {e.emoji} {e.title}
                        </div>
                      ))}
                      {myEvents.length > 2 && (
                        <span className="text-[8px] text-muted-foreground">+{myEvents.length - 2}</span>
                      )}
                      {/* Friend events */}
                      {fEvents.slice(0, 2).map(e => {
                        const cIdx = getFriendColorIndex(e.friendUserId);
                        return (
                          <div key={`${e.id}-${e.friendUserId}`} className={cn(
                            'w-full truncate text-[9px] leading-tight rounded px-0.5 font-medium mb-px',
                            FRIEND_BG_COLORS[cIdx], FRIEND_TEXT_COLORS[cIdx]
                          )}>
                            {e.emoji} {e.title}
                          </div>
                        );
                      })}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Selected Day Events */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dayEvents.map((e, i) => renderEventCard(e, i))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No plans yet — a perfect day to plan something! ✨</p>
              )}
              {/* Friend events for selected day */}
              {(() => {
                const fEvts = getFriendEventsForDate(selectedDate);
                if (fEvts.length === 0) return null;
                return (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Friend plans</p>
                    {fEvts.map(e => {
                      const cIdx = getFriendColorIndex(e.friendUserId);
                      const friend = friends.find(f => f.user_id === e.friendUserId);
                      return (
                        <div key={`${e.id}-${e.friendUserId}`} className={cn('rounded-xl p-3 mb-2', FRIEND_BG_COLORS[cIdx])}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{e.emoji}</span>
                            <span className={cn('font-medium text-sm', FRIEND_TEXT_COLORS[cIdx])}>{e.title}</span>
                          </div>
                          <p className={cn('text-xs mt-1', FRIEND_TEXT_COLORS[cIdx])}>
                            {friend?.username || 'Friend'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <Button
                onClick={() => navigate(`/create?date=${selectedDate.toISOString().split('T')[0]}`)}
                className="mt-4 w-full gap-2"
              >
                <Plus className="h-4 w-4" /> Create event on this day
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CalendarPage;
