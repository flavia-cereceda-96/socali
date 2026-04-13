import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/UserAvatar';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio((profile as any).bio || '');
      setAvatarUrl((profile as any).avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadErr) { toast.error(uploadErr.message); return; }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user.id);

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
        .update({ username: username.trim(), bio: bio.trim() || null })
        .eq('user_id', user.id);

      if (error) { toast.error(error.message); return; }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile saved! ✨');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <motion.h1
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Settings
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <UserAvatar avatarUrl={avatarUrl} username={username} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              placeholder="yourname"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">What should people invite you to (and NOT invite you to)?</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="e.g. Always down for tacos and hiking 🌮🥾 Please no karaoke nights 🙈"
              rows={3}
              className="resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full font-semibold" size="lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>

          <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground gap-2">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
