import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, useEvents, useFriends } from '@/hooks/useEvents';
import { useGroups } from '@/hooks/useGroups';
import { GroupAvatar } from '@/components/GroupAvatar';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Settings as SettingsIcon, Pencil, Clock, MapPin, X, Sparkles } from 'lucide-react';
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
  const [bio, setBio] = useState('');
  const [inviteTo, setInviteTo] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio((profile as any).bio || '');
      setInviteTo((profile as any).invite_to || '');
      setAvatarUrl((profile as any).avatar_url || null);
    }
  }, [profile]);

  // ===== Stats =====
  const stats = useMemo(() => {
    if (!userId) return { created: 0, attended: 0, friends: friends.length };
    const created = events.filter(e => e.created_by === userId).length;
    const attended = events.filter(e => {
      if (e.created_by === userId) return true;
      const me = e.participants.find(p => p.user_id === userId);
      return me?.status === 'confirmed';
    }).length;
    return { created, attended, friends: friends.length };
  }, [events, userId, friends]);

  // ===== Top friends by shared events =====
  const topFriends = useMemo(() => {
    if (!userId) return [];
    const counts: Record<string, { count: number; profile: any }> = {};
    events.forEach(e => {
      const involved = new Set<string>([e.created_by, ...e.participants.map(p => p.user_id)]);
      if (!involved.has(userId)) return;
      // build profile map for this event
      const profMap: Record<string, any> = {};
      if (e.creator_profile) profMap[e.created_by] = { username: e.creator_profile.username, avatar_url: e.creator_profile.avatar_url, user_id: e.created_by };
      e.participants.forEach(p => {
        if (p.profile) profMap[p.user_id] = p.profile;
      });
      involved.forEach(uid => {
        if (uid === userId) return;
        if (!counts[uid]) counts[uid] = { count: 0, profile: profMap[uid] || { user_id: uid } };
        counts[uid].count += 1;
        if (!counts[uid].profile && profMap[uid]) counts[uid].profile = profMap[uid];
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events, userId]);

  // ===== Upcoming (confirmed) =====
  const upcoming = useMemo(() => {
    if (!userId) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        if (d < today) return false;
        if (e.created_by === userId) return true;
        const me = e.participants.find(p => p.user_id === userId);
        return me?.status === 'confirmed';
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [events, userId]);

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

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <motion.h1
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-foreground"
            >
              Profile
            </motion.h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Edit profile"
            >
              <Pencil className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <UserAvatar avatarUrl={avatarUrl} username={username} size="xl" />
            <h2 className="mt-3 text-xl font-bold text-foreground">{username}</h2>
            {bio && (
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed max-w-xs">{bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#6B45F5', color: '#ffffff' }}>
              <p className="text-2xl font-bold">{stats.created}</p>
              <p className="text-[11px] opacity-90 mt-0.5">Events created</p>
            </div>
            <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}>
              <p className="text-2xl font-bold">{stats.attended}</p>
              <p className="text-[11px] mt-0.5 opacity-90">Events attended</p>
            </div>
            <div className="rounded-2xl p-3 shadow-card text-center" style={{ backgroundColor: '#FFE0CC', color: '#C2410C' }}>
              <p className="text-2xl font-bold">{stats.friends}</p>
              <p className="text-[11px] mt-0.5 opacity-90">Friends</p>
            </div>
          </div>

          {/* Top friends */}
          {topFriends.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your top friends
              </h3>
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-1">
                  {topFriends.map((f: any) => {
                    const name = f.profile?.username || '';
                    const first = name.charAt(0).toUpperCase() + name.slice(1);
                    return (
                      <button
                        key={f.profile?.user_id || name}
                        onClick={() => f.profile?.user_id && navigate(`/person/${f.profile.user_id}`)}
                        className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0"
                      >
                        <UserAvatar avatarUrl={f.profile?.avatar_url} username={name} size="lg" />
                        <span className="text-xs text-foreground truncate max-w-full">{first}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Groups */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your groups
            </h3>
            {groups.length === 0 ? (
              <button
                onClick={() => navigate('/people/groups/new')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                No groups yet — create one!
              </button>
            ) : (
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-1">
                  {groups.map((g: any) => (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/people/groups/${g.id}`)}
                      className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0"
                    >
                      <GroupAvatar avatarUrl={g.avatar_url} emoji={g.emoji} name={g.name} size="lg" />
                      <span className="text-xs text-foreground truncate max-w-full">{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Coming up */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Coming up
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No confirmed plans yet ✨</p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map(e => (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/event/${e.id}`)}
                    className="flex gap-3 rounded-2xl bg-card p-4 shadow-card text-left hover:shadow-elevated transition-shadow"
                  >
                    <div
                      className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[52px]"
                      style={{ backgroundColor: '#CFFCE3', color: '#1A9E55' }}
                    >
                      <span className="text-xs font-semibold uppercase">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-bold">
                        {new Date(e.date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{e.emoji}</span>
                        <span className="font-semibold text-foreground truncate">{e.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {e.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(e.time)}</span>}
                        {e.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{e.location}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Invite preferences */}
          {inviteTo && (
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Invite me to
              </h3>
              <div className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed">{inviteTo}</p>
              </div>
            </section>
          )}
        </motion.div>
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
              className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
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
