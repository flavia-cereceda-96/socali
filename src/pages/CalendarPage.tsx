import { useState, useMemo, useRef } from 'react';
import { useEvents, useFriends, DbEvent } from '@/hooks/useEvents';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Clock } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FRIEND_COLORS = [
  'bg-blue-500', 'bg-rose-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-violet-500', 'bg-cyan-500',
];

type ViewMode = 'day' | 'week' | 'month';

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

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const { data: friends = [] } = useFriends();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const inputRef = useRef<HTMLInputElement>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getEventsForDate = (date: Date) =>
    events.filter(e => isDateInRange(date, e.date, e.end_date));

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

  const shift = (dir: number) => {
    if (viewMode === 'day') {
      const d = new Date(selectedDate || today);
      d.setDate(d.getDate() + dir);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate || today);
      d.setDate(d.getDate() + dir * 7);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setCurrentMonth(new Date(year, month + dir, 1));
      setSelectedDate(null);
    }
  };

  const weekDays = useMemo(() => getWeekDays(selectedDate || today), [selectedDate]);
  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const activeDate = selectedDate || today;

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
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs">👤</span>
                      </div>
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
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs">👤</span>
                    </div>
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

        {/* View Mode Tabs */}
        <div className="mb-4 flex rounded-xl bg-secondary p-1">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === 'day' && !selectedDate) setSelectedDate(today);
              }}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm font-medium transition-all capitalize',
                viewMode === mode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Navigation Header */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">
            {viewMode === 'day' && activeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {viewMode === 'week' && (() => {
              const wk = getWeekDays(activeDate);
              const s = wk[0]; const e = wk[6];
              if (s.getMonth() === e.getMonth()) {
                return `${s.toLocaleDateString('en-US', { month: 'long' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
              }
              return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            })()}
            {viewMode === 'month' && currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => shift(1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <>
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(year, month, i + 1);
                const isToday = isSameDay(date, today);
                const hasEvent = events.some(e => isDateInRange(date, e.date, e.end_date));
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-sm transition-all',
                      isSelected ? 'bg-primary text-primary-foreground font-bold' :
                      isToday ? 'bg-primary/10 text-primary font-semibold' :
                      'hover:bg-secondary text-foreground'
                    )}
                  >
                    {i + 1}
                    {hasEvent && !isSelected && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <>
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weekDays.map((date, i) => {
                const isToday = isSameDay(date, today);
                const hasEvent = events.some(e => isDateInRange(date, e.date, e.end_date));
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'relative flex h-12 w-full flex-col items-center justify-center rounded-xl text-sm transition-all',
                      isSelected ? 'bg-primary text-primary-foreground font-bold' :
                      isToday ? 'bg-primary/10 text-primary font-semibold' :
                      'hover:bg-secondary text-foreground'
                    )}
                  >
                    {date.getDate()}
                    {hasEvent && !isSelected && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                {dayEvents.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {dayEvents.map((e, i) => renderEventCard(e, i))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No plans yet ✨</p>
                )}
                <Button
                  onClick={() => navigate(`/create?date=${selectedDate.toISOString().split('T')[0]}`)}
                  className="mt-4 w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Create event on this day
                </Button>
              </motion.div>
            )}
          </>
        )}

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
            {(() => {
              const dayEvts = getEventsForDate(activeDate);
              return (
                <>
                  {dayEvts.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {dayEvts.map((e, i) => renderEventCard(e, i))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No plans for this day ✨</p>
                  )}
                  <Button
                    onClick={() => navigate(`/create?date=${activeDate.toISOString().split('T')[0]}`)}
                    className="mt-4 w-full gap-2"
                  >
                    <Plus className="h-4 w-4" /> Create event on this day
                  </Button>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Selected Day Events (month view) */}
        {viewMode === 'month' && (
          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
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
                <Button
                  onClick={() => navigate(`/create?date=${selectedDate.toISOString().split('T')[0]}`)}
                  className="mt-4 w-full gap-2"
                >
                  <Plus className="h-4 w-4" /> Create event on this day
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
