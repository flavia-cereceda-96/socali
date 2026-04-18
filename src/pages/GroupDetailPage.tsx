import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Plus, ArrowRight } from 'lucide-react';
import { useFriends, DbProfile } from '@/hooks/useEvents';
import {
  useGroup,
  useAddGroupMembers,
  useRemoveGroupMember,
  useDeleteGroup,
} from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { FriendChipPicker } from '@/components/FriendChipPicker';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: group, isLoading } = useGroup(id);
  const { data: friends = [] } = useFriends();
  const addMembers = useAddGroupMembers();
  const removeMember = useRemoveGroupMember();
  const deleteGroup = useDeleteGroup();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toAdd, setToAdd] = useState<DbProfile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  if (isLoading || !group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isCreator = currentUserId === group.created_by;
  const memberIds = new Set(group.members.map(m => m.user_id));
  const addableFriends = friends.filter(f => !memberIds.has(f.user_id));

  const handleAdd = async () => {
    if (toAdd.length === 0) return;
    try {
      await addMembers.mutateAsync({
        groupId: group.id,
        userIds: toAdd.map(p => p.user_id),
      });
      toast.success(`Added ${toAdd.length} member${toAdd.length === 1 ? '' : 's'}`);
      setToAdd([]);
      setShowAdd(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add members');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember.mutateAsync({ groupId: group.id, userId });
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup.mutateAsync(group.id);
      toast.success('Group deleted');
      navigate('/people', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleLeave = async () => {
    if (!currentUserId) return;
    try {
      await removeMember.mutateAsync({ groupId: group.id, userId: currentUserId });
      toast.success('You left the group');
      navigate('/people', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/people')}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 truncate">
            <span className="text-2xl">{group.emoji}</span>
            <span className="truncate">{group.name}</span>
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Members ({group.members.length})
            </h2>
            <div className="flex flex-col gap-2">
              {group.members.map(m => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <UserAvatar avatarUrl={m.avatar_url} username={m.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">@{m.username}</p>
                  </div>
                  {m.user_id === group.created_by && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Admin
                    </span>
                  )}
                  {isCreator && m.user_id !== group.created_by && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${m.username}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!showAdd && addableFriends.length > 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Add members
              </button>
            )}

            {showAdd && (
              <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-3">
                <FriendChipPicker
                  friends={addableFriends}
                  selected={toAdd}
                  onChange={setToAdd}
                  placeholder="@username to add..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={toAdd.length === 0 || addMembers.isPending}
                    className="flex-1"
                  >
                    {addMembers.isPending ? 'Adding...' : `Add ${toAdd.length || ''}`}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowAdd(false); setToAdd([]); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => navigate(`/create?groupId=${group.id}`)}
            size="lg"
            className="w-full font-semibold"
          >
            Plan something together <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="pt-2 text-center">
            {isCreator ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-destructive/70 hover:text-destructive"
              >
                Delete group
              </button>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                className="text-sm font-medium text-destructive/70 hover:text-destructive"
              >
                Leave group
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the group for everyone. Plans already created are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this group?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop seeing this group and won't be auto-included in future invites for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupDetailPage;
