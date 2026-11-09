import { useState, useRef, useEffect, useMemo } from 'react';
import { personName } from '@/lib/personName';
import { useNavigate } from 'react-router-dom';
import { useProfile, useEvents, useFriends } from '@/hooks/useEvents';
import { useGroups } from '@/hooks/useGroups';
import { GroupAvatar } from '@/components/GroupAvatar';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Settings as SettingsIcon, X, Plus, ChevronRight } from 'lucide-react';
import { IdentityBlock, StatTile, SectionHeader, MemoryGrid, attended, eventPeople, todayStr } from '@/components/profile/ProfileBits';
import { publicAppUrl } from '@/lib/appUrl';
import { shareAppLink } from '@/lib/nativeLinks';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const ProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { data: events = [] } = useEvents();
  const { data: friends = [] } = useFriends();
  const { data: groups = [] } = useGroups();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [inviteTo, setInviteTo] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName((profile as any).display_name || '');
      setBio((profile as any).bio || '');
      setInviteTo((profile as any).invite_to || '');
      setAvatarUrl((profile as any).avatar_url || null);
    }
  }, [profile]);

  const today = todayStr();
  const stats = useMemo(() => {
    if (!userId) return { created: 0, attended: 0, friends: friends.length };
    return {
      created: events.filter(e => e.created_by === userId).length,
      attended: events.filter(e => attended(e, userId)).length,
      friends: friends.length,
    };
  }, [events, userId, friends]);

  // Shared plans per friend (all time) and past plans this year
  const { topFriends, mostSeen } = useMemo(() => {
    const friendIds = new Set(friends.map(f => f.user_id));
    const all: Record<string, number> = {};
    const year: Record<string, number> = {};
    const thisYear = String(new Date().getFullYear());
    if (userId) events.forEach(e => {
      if (!attended(e, userId)) return;
      eventPeople(e, userId).filter(p => p.status === 'confirmed' && friendIds.has(p.id)).forEach(p => {
        all[p.id] = (all[p.id] || 0) + 1;
        if (e.date < today && e.date.startsWith(thisYear)) year[p.id] = (year[p.id] || 0) + 1;
      });
    });
    const sorted = [...friends].sort((a, b) => (all[b.user_id] || 0) - (all[a.user_id] || 0));
    const bestId = Object.entries(year).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { topFriends: sorted, mostSeen: friends.find(f => f.user_id === bestId) || null };
  }, [events, friends, userId, today]);

  const memories = useMemo(() => {
    if (!userId) return [];
    return events.filter(e => e.date < today && attended(e, userId)).sort((a, b) => b.date.localeCompare(a.date));
  }, [events, userId, today]);
  const [showAllMemories, setShowAllMemories] = useState(false);

  const usageLabels: Record<string, string> = { spouse: 'dates with my partner', friends: 'group hangs', own: 'my own plans' };
  const downFor = String((profile as any)?.usage || '').split(',').map(s => usageLabels[s.trim()]).filter(Boolean);
  const hardPass = String((profile as any)?.hard_pass || '').trim();

  const shareProfile = async () => {
    if (!userId) return;
    try {
      await shareAppLink({ title: 'Join me on C A L I', text: "Let's plan things together on C A L I ✨", url: publicAppUrl(`/welcome?ref=${userId}`) });
    } catch { /* cancelled */ }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/welcome');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) { toast.error(uploadErr.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if (updateErr) { toast.error(updateErr.message); return; }
      setAvatarUrl(url);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Photo updated! 📸');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!username.trim()) { toast.error('Username is required'); return; }
    if (/\s/.test(username)) { toast.error('No spaces in username'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          display_name: displayName.trim().slice(0, 40) || null,
          bio: bio.trim() || null,
          invite_to: inviteTo.trim() || null,
        } as any)
        .eq('user_id', user.id);
      if (error) { toast.error(error.message); return; }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile saved! ✨');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const shownName = personName({ display_name: (profile as any)?.display_name, username: profile?.username }, '');
  const footer = [
    { label: 'Settings', onClick: () => navigate('/settings') },
    { label: 'Feedback & ideas', onClick: () => navigate('/feedback') },
    { label: 'Help & privacy', onClick: () => navigate('/privacy') },
  ];

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-2 flex justify-end">
          <button onClick={() => navigate('/settings')} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground" aria-label="Settings">
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
          <div>
            <IdentityBlock avatarUrl={avatarUrl} userId={userId || undefined} name={shownName} username={profile?.username || ''} bio={(profile as any)?.bio} onAvatarClick={() => setAvatarPreviewOpen(true)} />
            {(downFor.length > 0 || hardPass) && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {downFor.length > 0 && (
                  <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-soft-foreground">Down for: {downFor.join(', ')}</span>
                )}
                {hardPass && (
                  <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--peach-soft))', color: 'hsl(var(--peach-foreground))' }}>Hard pass: {hardPass}</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setEditing(true)} className="h-12 rounded-2xl bg-muted text-sm font-semibold text-foreground">Edit profile</button>
            <button onClick={shareProfile} className="h-12 rounded-2xl bg-foreground text-sm font-semibold text-background">Share profile</button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <StatTile value={stats.created} label="plans made" bg="--primary" fg="--primary-foreground" />
              <StatTile value={stats.attended} label="hangouts" bg="--secondary" fg="--secondary-foreground" />
              <StatTile value={stats.friends} label="friends" bg="--accent" fg="--accent-foreground" />
            </div>
            {mostSeen && (
              <button onClick={() => navigate(`/person/${mostSeen.user_id}`)} className="flex w-full items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-left text-sm text-muted-foreground">
                Most seen this year:
                <UserAvatar avatarUrl={mostSeen.avatar_url} username={personName(mostSeen)} userId={mostSeen.user_id} size="xs" />
                <span className="font-semibold text-foreground">{personName(mostSeen)}</span>
              </button>
            )}
          </div>

          {topFriends.length > 0 && (
            <section>
              <SectionHeader title="Top friends" />
              <div className="flex gap-3">
                {topFriends.slice(0, 4).map(f => (
                  <button key={f.user_id} onClick={() => navigate(`/person/${f.user_id}`)} className="flex w-16 flex-col items-center gap-1.5">
                    <UserAvatar avatarUrl={f.avatar_url} username={personName(f)} userId={f.user_id} className="h-14 w-14 ring-2 ring-accent ring-offset-2 ring-offset-background" />
                    <span className="max-w-full truncate text-xs text-foreground">{personName(f).split(' ')[0]}</span>
                  </button>
                ))}
                {topFriends.length > 4 && (
                  <button onClick={() => navigate('/people')} className="flex w-16 flex-col items-center gap-1.5">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">+{topFriends.length - 4}</span>
                    <span className="text-xs text-muted-foreground">all</span>
                  </button>
                )}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="Groups" />
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
              <div className="flex gap-3 pb-1">
                {groups.map((g: any) => (
                  <button key={g.id} onClick={() => navigate(`/people/groups/${g.id}`)} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                    <GroupAvatar avatarUrl={g.avatar_url} emoji={g.emoji} name={g.name} size="lg" />
                    <span className="max-w-full truncate text-xs text-foreground">{g.name}</span>
                  </button>
                ))}
                <button onClick={() => navigate('/people/groups/new')} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground"><Plus className="h-5 w-5" /></span>
                  <span className="text-xs text-muted-foreground">New</span>
                </button>
              </div>
            </div>
          </section>

          {memories.length > 0 && (
            <section>
              <SectionHeader title="Memories" action={memories.length > 4 && (
                <button onClick={() => setShowAllMemories(v => !v)} className="text-sm font-semibold text-primary">{showAllMemories ? 'Show less' : 'See all'}</button>
              )} />
              <MemoryGrid events={showAllMemories ? memories : memories.slice(0, 4)} viewerId={userId} />
            </section>
          )}

          <ul className="divide-y divide-border overflow-hidden rounded-[20px] bg-muted">
            {footer.map(item => (
              <li key={item.label}>
                <button onClick={item.onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-foreground">
                  {item.label}<ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
            <li>
              <button onClick={logout} className="w-full px-4 py-3.5 text-left text-sm font-semibold text-destructive">Log out</button>
            </li>
          </ul>
        </motion.div>

        <AnimatePresence>
          {avatarPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAvatarPreviewOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
            >
              <button
                onClick={() => setAvatarPreviewOpen(false)}
                className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 240 }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username || 'Profile'}
                    className="max-h-[80vh] max-w-[80vw] rounded-full object-cover shadow-2xl"
                  />
                ) : (
                  <div className="flex h-72 w-72 items-center justify-center rounded-full bg-secondary text-7xl font-semibold text-muted-foreground shadow-2xl">
                    {username ? username[0].toUpperCase() : '?'}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
            onClick={() => !saving && setEditing(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Edit profile</h2>
                <button onClick={() => setEditing(false)} className="p-2 -mr-2 text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative">
                  <UserAvatar avatarUrl={avatarUrl} username={username} size="xl" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value.slice(0, 40))}
                    maxLength={40}
                    placeholder="What should friends call you?"
                  />
                  <p className="text-xs text-muted-foreground">Optional. Shown instead of your @username.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                    placeholder="yourname"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="A short line about you"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inviteTo">What should people invite you to?</Label>
                  <Textarea
                    id="inviteTo"
                    value={inviteTo}
                    onChange={e => setInviteTo(e.target.value)}
                    placeholder="e.g. Always down for tacos and hiking 🌮🥾 Please no karaoke nights 🙈"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full font-semibold" size="lg">
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
