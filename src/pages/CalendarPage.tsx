import { useState, useMemo, useRef, useEffect } from 'react';
import { useEvents, useFriends, DbEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { CoachMark } from '@/components/CoachMark';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Exact hex per spec, applied at 70% opacity via inline style
const FRIEND_TINTS = ['#DBEAFE', '#EDE9FE', '#DCFCE7'];
const MAX_FRIENDS = 3;

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

// Build the 6-row x 7-col grid for a given month, padded with adjacent-month days
function buildMonthGrid(viewMonth: Date): Date[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = first.getDay(); // 0=Sun
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

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [maxWarning, setMaxWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const monthDays = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goPrevMonth = () => {
    setDirection(-1);
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setDirection(1);
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };
  const goToday = () => {
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

  const getFriendColorIndex = (friendId: string) => {
    const idx = selectedFriends.indexOf(friendId);
    return idx >= 0 ? idx % FRIEND_TINTS.length : 0;
  };

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
    setSheetOpen(true);
  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const dayFriendEvents = selectedDate ? getFriendEventsForDate(selectedDate) : [];

  const renderEventCard = (event: DbEvent, i: number) => (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
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
          {event.time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.time}{event.end_time ? ` – ${event.end_time}` : ''}
            </span>
          )}
          {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{event.location}</span>}
        </div>
      </div>
    </motion.div>
  );

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen pb-24">
      <CoachMark
        id="calendar-grid"
        text="Tap any day to see or add plans"
        anchorSelector='[data-coach="calendar-grid"]'
        placement="top"
      />

      <div className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-2xl font-bold text-foreground mb-4">Calendar</h1>

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
          <button
            onClick={goPrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="flex-1 text-center text-[18px] font-bold text-foreground">{monthLabel}</h2>
          <button
            onClick={goNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Sticky day-of-week labels */}
        <div className="sticky top-[57px] z-10 -mx-4 grid grid-cols-7 bg-background px-4 pb-1 text-center text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Animated month grid */}
        <div data-coach="calendar-grid" className="relative overflow-hidden">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div
              key={viewMonth.toISOString()}
              custom={direction}
              initial={{ x: direction * 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * 30, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="grid grid-cols-7 gap-0.5"
            >
              {monthDays.map((date, i) => {
                const inMonth = date.getMonth() === viewMonth.getMonth();
                const isToday = isSameDay(date, today);
                const myEvts = getEventsForDate(date);
                const fEvts = getFriendEventsForDate(date);

                // Compute friend tint background — diagonal gradient if multiple
                const busyFriendIdxs = Array.from(
                  new Set(fEvts.map(e => getFriendColorIndex(e.friendUserId)))
                );
                let bgStyle: React.CSSProperties = {};
                if (busyFriendIdxs.length === 1) {
                  bgStyle = { backgroundColor: FRIEND_TINTS[busyFriendIdxs[0]], opacity: inMonth ? 0.7 : 0.2 };
                } else if (busyFriendIdxs.length > 1) {
                  const stops = busyFriendIdxs
                    .map((cIdx, j) => {
                      const start = (j / busyFriendIdxs.length) * 100;
                      const end = ((j + 1) / busyFriendIdxs.length) * 100;
                      return `${FRIEND_TINTS[cIdx]} ${start}%, ${FRIEND_TINTS[cIdx]} ${end}%`;
                    })
                    .join(', ');
                  bgStyle = { backgroundImage: `linear-gradient(135deg, ${stops})`, opacity: inMonth ? 0.7 : 0.2 };
                }

                return (
                  <button
                    key={i}
                    disabled={!inMonth}
                    onClick={() => openDay(date)}
                    className={cn(
                      'relative flex flex-col items-center justify-start min-h-[56px] rounded-lg p-1 transition-all',
                      !inMonth && 'opacity-30 pointer-events-none',
                      inMonth && 'hover:bg-secondary/40 active:scale-95'
                    )}
                    style={bgStyle}
                  >
                    {/* Date number — terracotta circle if today */}
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium',
                      isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                    )}>
                      {date.getDate()}
                    </div>

                    {/* User event dots */}
                    {myEvts.length > 0 && (
                      <div className="mt-1 flex items-center gap-0.5">
                        {myEvts.length <= 2 ? (
                          myEvts.slice(0, 2).map(e => (
                            <span key={e.id} className="h-[7px] w-[7px] rounded-full bg-primary" />
                          ))
                        ) : (
                          <>
                            <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                            <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                            <span className="text-[10px] font-bold leading-none text-primary">+</span>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Day detail bottom sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl p-0 flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-muted" />
          </div>

          <SheetHeader className="px-5 pb-3 shrink-0">
            <SheetTitle className="text-left text-base font-bold text-foreground">
              {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {dayEvents.length === 0 && dayFriendEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="mb-4 text-sm text-muted-foreground">Nothing planned — tap + to add something ✨</p>
                <Button
                  onClick={() => {
                    if (!selectedDate) return;
                    setSheetOpen(false);
                    navigate(`/create?date=${selectedDate.toISOString().split('T')[0]}`);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Create event
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {dayEvents.map((e, i) => renderEventCard(e, i))}
                {dayFriendEvents.map(e => {
                  const cIdx = getFriendColorIndex(e.friendUserId);
                  const friend = friends.find(f => f.user_id === e.friendUserId);
                  const tint = FRIEND_TINTS[cIdx];
                  return (
                    <div
                      key={`${e.id}-${e.friendUserId}`}
                      className="flex gap-3 rounded-2xl bg-card p-4 shadow-card"
                      style={{ borderLeft: `3px solid ${tint}` }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{ backgroundColor: tint }}
                      >
                        {e.emoji}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <span className="font-semibold text-foreground truncate">{e.title}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <UserAvatar avatarUrl={friend?.avatar_url} username={friend?.username} size="sm" />
                            {friend?.username || 'Friend'}
                          </span>
                          {e.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {e.time}{e.end_time ? ` – ${e.end_time}` : ''}
                            </span>
                          )}
                          {e.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />{e.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Always-available add button when there are events */}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!selectedDate) return;
                    setSheetOpen(false);
                    navigate(`/create?date=${selectedDate.toISOString().split('T')[0]}`);
                  }}
                  className="mt-2 w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Add another event
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CalendarPage;
