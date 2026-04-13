import { useState } from 'react';
import { friends, Friend } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const quickEmojis = ['🍝', '🎬', '🏃', '🎮', '🍕', '☕', '🎉', '🎵'];

const CreateEventPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const toggleFriend = (f: Friend) => {
    setSelectedFriends(prev =>
      prev.find(p => p.id === f.id) ? prev.filter(p => p.id !== f.id) : [...prev, f]
    );
  };

  const handleSend = () => {
    toast.success('Plan sent! 🎉', { description: `${title || 'New plan'} with ${selectedFriends.map(f => f.name).join(', ')}` });
    navigate('/');
  };

  const messages: { from: 'bot' | 'user'; text: string }[] = [];

  if (step >= 0) messages.push({ from: 'bot', text: "What are you planning? 🤩" });
  if (step >= 1) {
    messages.push({ from: 'user', text: `${emoji} ${title}` });
    messages.push({ from: 'bot', text: "Who's joining?" });
  }
  if (step >= 2) {
    messages.push({ from: 'user', text: selectedFriends.map(f => f.emoji + ' ' + f.name).join(', ') });
    messages.push({ from: 'bot', text: "When works?" });
  }
  if (step >= 3) {
    messages.push({ from: 'user', text: `${dateStr} at ${timeStr}` });
    messages.push({ from: 'bot', text: "Looks great! Send it? 🚀" });
  }

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-12">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Plan Something</h1>
        </div>

        {/* Chat Messages */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.from === 'bot'
                    ? 'self-start bg-secondary text-secondary-foreground'
                    : 'self-end bg-primary text-primary-foreground'
                )}
              >
                {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="mt-4">
          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {quickEmojis.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all',
                      emoji === e ? 'bg-primary/20 scale-110' : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Dinner, Movie Night..."
                  className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => title.trim() && setStep(1)}
                  disabled={!title.trim()}
                  className="rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {friends.map(f => {
                  const selected = selectedFriends.find(s => s.id === f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFriend(f)}
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      )}
                    >
                      {f.emoji} {f.name}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => selectedFriends.length > 0 && setStep(2)}
                disabled={selectedFriends.length === 0}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Next →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="time"
                  value={timeStr}
                  onChange={e => setTimeStr(e.target.value)}
                  className="w-28 rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={() => dateStr && timeStr && setStep(3)}
                disabled={!dateStr || !timeStr}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Next →
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={handleSend}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-elevated transition-transform active:scale-[0.98]"
              >
                Send Plan 🚀
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
