import { useState, useMemo, useRef } from 'react';
import { useEvents, useFriends } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { CoachMark } from '@/components/CoachMark';
import { useWeekStart, weekStartIndex } from '@/hooks/useWeekStart';
import { AppHeader } from '@/components/AppHeader';
import { WeeksCalendar } from '@/components/WeeksCalendar';
import { CalendarDayTimeline } from '@/components/CalendarDayTimeline';
import { buildFourWeeks, calendarDateKey } from '@/lib/calendarDisplay';
import { addDays, format } from 'date-fns';

// Exact hex per spec, applied at 70% opacity via inline style
const FRIEND_TINTS = ['#DBEAFE', '#EDE9FE', '#DCFCE7'];
const MAX_FRIENDS = 3;

function isDateInRange(date: Date, startStr: string, endStr?: string | null) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(startStr + 'T00:00:00').getTime();
  if (!endStr) return d === s;
  const e = new Date(endStr + 'T00:00:00').getTime();
  return d >= s && d <= e;
}

// Build the 6-row x 7-col grid for a given month, padded with adjacent-month days.
// `weekStart` is 0=Sunday or 1=Monday.
function buildMonthGrid(viewMonth: Date, weekStart: 0 | 1): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = (first.getDay() - weekStart + 7) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

interface FriendEvent {
  id: string;
  date: string;
  end_date: string | null;
  title: string;
  emoji: string;
  time?: string | null;
  end_time?: string | null;
  location?: string | null;
  friendUserId: string;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const { data: friends = [] } = useFriends();
  const today = useMemo(() => new Date(), []);
  const weekStart = useWeekStart();
  const wsIdx = weekStartIndex(weekStart) as 0 | 1;

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<'fourweeks' | 'month'>('fourweeks');
  const [anchor, setAnchor] = useState(today);
  const fourWeekDays = useMemo(() => buildFourWeeks(anchor, wsIdx), [anchor, wsIdx]);
  const { data: userId } = useQuery({ queryKey: ['calendar-user'], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }});
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [maxWarning, setMaxWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const monthDays = useMemo(() => buildMonthGrid(viewMonth, wsIdx), [viewMonth, wsIdx]);

  const goPrevMonth = () => {
    setDirection(-1);
    if (view === 'fourweeks') { const next = addDays(anchor, -28); setAnchor(next); setSelectedDate(buildFourWeeks(next, wsIdx)[0]); return; }
    setViewMonth(m => { const next = new Date(m.getFullYear(), m.getMonth() - 1, 1); setSelectedDate(next); return next; });
  };
  const goNextMonth = () => {
    setDirection(1);
    if (view === 'fourweeks') { const next = addDays(anchor, 28); setAnchor(next); setSelectedDate(buildFourWeeks(next, wsIdx)[0]); return; }
    setViewMonth(m => { const next = new Date(m.getFullYear(), m.getMonth() + 1, 1); setSelectedDate(next); return next; });
  };
  const goToday = () => {
    setAnchor(today);
    setSelectedDate(today);
    const cur = new Date(today.getFullYear(), today.getMonth(), 1);
    setDirection(cur > viewMonth ? 1 : -1);
    setViewMonth(cur);
  };

  // Fetch friend events when friends are selected
  const { data: friendEvents = [] } = useQuery({
    queryKey: ['friend-events', selectedFriends.join(',')],
    queryFn: async () => {
      if (selectedFriends.length === 0) return [];
      const allFriendEvents: FriendEvent[] = [];

      for (const fId of selectedFriends) {
        const { data: created } = await supabase
          .from('events')
          .select('id, date, end_date, title, emoji, time, end_time, location')
          .eq('created_by', fId);

        (created || []).forEach(e => allFriendEvents.push({ ...e, friendUserId: fId }));

        const { data: parts } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', fId);

        if (parts && parts.length > 0) {
          const { data: partEvents } = await supabase
            .from('events')
            .select('id, date, end_date, title, emoji, time, end_time, location')
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

  // Friends shown in dropdown when user types `@` or focuses with `@`
  const filteredFriends = useMemo(() => {
    const atIndex = query.lastIndexOf('@');
    if (atIndex === -1) return [];
    const search = query.slice(atIndex + 1).toLowerCase();
    return friends.filter(
      f => !selectedFriends.includes(f.user_id) && f.username.toLowerCase().includes(search)
    );
  }, [query, selectedFriends, friends]);

  const selectFriend = (userId: string) => {
    if (selectedFriends.length >= MAX_FRIENDS) {
      setMaxWarning(true);
      setTimeout(() => setMaxWarning(false), 3000);
      return;
    }
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

  const handleInputFocus = () => {
    if (!query) {
      setQuery('@');
      setShowDropdown(true);
    } else if (query.includes('@')) {
      setShowDropdown(true);
    }
  };

  const openDay = (date: Date) => {
    setSelectedDate(date);

  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const dayFriendEvents = selectedDate ? getFriendEventsForDate(selectedDate) : [];

  const monthLabel = view === 'month' ? viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${format(fourWeekDays[0], 'd MMM')} – ${format(fourWeekDays[27], 'd MMM yyyy')}`;

  return (
    <div className="min-h-screen pb-24">
      <CoachMark
        id="calendar-grid"
        text="Tap any day to see or add plans"
        anchorSelector='[data-coach="calendar-grid"]'
        placement="top"
      />

      <AppHeader title="Calendar" />
      <div className="mx-auto max-w-2xl px-4 pt-2">
        <div className="mb-3 flex gap-1 rounded-full bg-muted p-1" role="group" aria-label="Calendar view">
          {(['fourweeks', 'month'] as const).map(mode => <Button key={mode} variant={view === mode ? 'secondary' : 'ghost'} aria-pressed={view === mode} onClick={() => { setView(mode); if (mode === 'month') setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); else setAnchor(selectedDate); }} className={cn('flex-1 rounded-full', view === mode && 'bg-secondary-foreground text-primary-foreground hover:bg-secondary-foreground/90')}>{mode === 'fourweeks' ? '4 weeks' : 'Month'}</Button>)}
        </div>

        {/* @-mention input */}
        <div className="relative mb-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Type @ to check a friend's availability..."
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <AnimatePresence>
            {showDropdown && filteredFriends.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
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

        {/* Selected friend chips — horizontal scroll, BELOW input */}
        {selectedFriends.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {selectedFriends.map((fId, idx) => {
              const friend = friends.find(f => f.user_id === fId);
              const tint = FRIEND_TINTS[idx % FRIEND_TINTS.length];
              return (
                <span
                  key={fId}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground"
                >
                  <UserAvatar avatarUrl={friend?.avatar_url} username={friend?.username} size="sm" />
                  {friend?.username || 'Unknown'}
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tint }} />
                  <button onClick={() => removeFriend(fId)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        {maxWarning && (
          <p className="mb-2 text-xs text-amber-600">Maximum 3 friends at once</p>
        )}

        {/* Sticky month header */}
        <div className="sticky top-0 z-20 -mx-4 bg-background px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon"
            onClick={goPrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label={view === 'month' ? 'Previous month' : 'Previous four weeks'}
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </Button>
          <h2 className="min-w-0 flex-1 text-center text-sm font-bold text-foreground sm:text-lg">{monthLabel}</h2>
          <Button variant="ghost" size="icon"
            onClick={goNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label={view === 'month' ? 'Next month' : 'Next four weeks'}
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </Button>
          <Button variant="secondary" size="sm"
            onClick={goToday}
            className="ml-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            Today
          </Button>
        </div>

        <WeeksCalendar days={view === 'fourweeks' ? fourWeekDays : monthDays} events={events} today={today} selectedDate={selectedDate} direction={direction} onOpenDay={openDay} getBusyPlans={getFriendEventsForDate} month={view === 'month' ? viewMonth : undefined} />
        <CalendarDayTimeline date={selectedDate} events={dayEvents} busyPlans={dayFriendEvents} userId={userId} friendName={id => friends.find(friend => friend.user_id === id)?.username || 'Friend'} onOpenEvent={id => navigate(`/event/${id}`)} onCreate={() => navigate(`/create?date=${calendarDateKey(selectedDate)}`)} />
      </div>

    </div>
  );
};

export default CalendarPage;
