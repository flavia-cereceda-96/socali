import { useState, useMemo, useRef } from 'react';
import { events, friends } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FRIEND_COLORS = [
  'bg-blue-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-cyan-500',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDateInRange(date: Date, start: Date, end?: Date) {
  if (!end) return isSameDay(date, start);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

function getFriendBusyDays(friendId: string): Date[] {
  const busyDays: Date[] = [];
  events.forEach(event => {
    const isParticipant = event.participants.some(p => p.friend.id === friendId);
    if (!isParticipant) return;
    if (event.endDate) {
      const current = new Date(event.date);
      while (current <= event.endDate) {
        busyDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      busyDays.push(new Date(event.date));
    }
  });
  return busyDays;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const friendBusyMap = useMemo(() => {
    const map: Record<string, Date[]> = {};
    selectedFriends.forEach(fId => {
      map[fId] = getFriendBusyDays(fId);
    });
    return map;
  }, [selectedFriends]);

  const filteredFriends = useMemo(() => {
    const atIndex = query.lastIndexOf('@');
    if (atIndex === -1) return [];
    const search = query.slice(atIndex + 1).toLowerCase();
    return friends.filter(
      f => !selectedFriends.includes(f.id) && f.name.toLowerCase().includes(search)
    );
  }, [query, selectedFriends]);

  const selectFriend = (id: string) => {
    setSelectedFriends(prev => [...prev, id]);
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeFriend = (id: string) => {
    setSelectedFriends(prev => prev.filter(f => f !== id));
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(value.includes('@'));
  };

  const shift = (dir: number) => {
    setCurrentMonth(new Date(year, month + dir, 1));
    setSelectedDate(null);
  };

  const dayEvents = selectedDate
    ? events.filter(e => isDateInRange(selectedDate, e.date, e.endDate))
    : [];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
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
                      key={friend.id}
                      onMouseDown={e => { e.preventDefault(); selectFriend(friend.id); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <div className="h-6 w-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs">{friend.emoji}</span>
                        )}
                      </div>
                      <span>{friend.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected friend pills */}
          {selectedFriends.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFriends.map(fId => {
                const friend = friends.find(f => f.id === fId)!;
                const idx = friends.findIndex(f => f.id === fId);
                return (
                  <span
                    key={fId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground"
                  >
                    <div className="h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs">{friend.emoji}</span>
                      )}
                    </div>
                    {friend.name}
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

        {/* Month Header */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => shift(1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-7 gap-1"
        >
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(year, month, i + 1);
            const isToday = isSameDay(date, today);
            const hasEvent = events.some(e => isDateInRange(date, e.date, e.endDate));
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            const busyFriends = selectedFriends.filter(fId =>
              friendBusyMap[fId]?.some(bd => isSameDay(bd, date))
            );

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
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {hasEvent && !isSelected && (
                    <span className="h-1 w-1 rounded-full bg-primary" />
                  )}
                  {busyFriends.map(fId => {
                    const idx = friends.findIndex(f => f.id === fId);
                    return (
                      <span
                        key={fId}
                        className={cn('h-1 w-1 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Selected Day Events */}
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

              {selectedFriends.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFriends.map(fId => {
                    const friend = friends.find(f => f.id === fId)!;
                    const idx = friends.findIndex(f => f.id === fId);
                    const isBusy = friendBusyMap[fId]?.some(bd => isSameDay(bd, selectedDate!));
                    return (
                      <span
                        key={fId}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          isBusy ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])} />
                        {friend.name}: {isBusy ? 'Busy' : 'Free'}
                      </span>
                    );
                  })}
                </div>
              )}

              {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dayEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
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
      </div>
    </div>
  );
};

export default CalendarPage;
