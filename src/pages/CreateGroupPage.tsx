import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { useFriends, DbProfile } from '@/hooks/useEvents';
import { useCreateGroup } from '@/hooks/useGroups';
import { FriendChipPicker } from '@/components/FriendChipPicker';
import { GroupAvatar } from '@/components/GroupAvatar';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const GROUP_EMOJIS = ['👯', '🎉', '🏕️', '🍕', '🎬', '🎮', '☕', '🏃', '🎵', '✈️', '🍷', '🎂'];

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends();
  const createGroup = useCreateGroup();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(GROUP_EMOJIS[0]);
  const [members, setMembers] = useState<DbProfile[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = name.trim().length > 0 && members.length > 0 && !createGroup.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const group = await createGroup.mutateAsync({
        name,
        emoji,
        memberIds: members.map(m => m.user_id),
      });

      // If avatar was selected, upload it now (we need group.id for the path)
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${group.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('group-avatars')
          .upload(path, avatarFile, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('group-avatars').getPublicUrl(path);
          const url = `${publicUrl}?t=${Date.now()}`;
          await supabase.from('groups').update({ avatar_url: url }).eq('id', group.id);
        }
      }

      toast.success(`${emoji} ${group.name} created!`);
      navigate(`/people/groups/${group.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">New group</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <GroupAvatar avatarUrl={avatarPreview} emoji={emoji} name={name} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                aria-label="Upload group photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">Optional group photo</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 40))}
              placeholder="e.g. Uni friends, Work crew, Family..."
              maxLength={40}
            />
            <p className="text-[11px] text-muted-foreground">{name.length}/40</p>
          </div>

          <div className="space-y-2">
            <Label>Pick an emoji</Label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {GROUP_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl transition-all',
                    emoji === e
                      ? 'bg-primary/20 ring-2 ring-primary/40 scale-110'
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Add members</Label>
            <FriendChipPicker
              friends={friends}
              selected={members}
              onChange={setMembers}
              placeholder="@username to add a friend..."
            />
            {friends.length === 0 && (
              <p className="text-xs text-muted-foreground">
                You need friends first — add some on the Friends tab.
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full font-semibold"
            size="lg"
          >
            {createGroup.isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateGroupPage;
