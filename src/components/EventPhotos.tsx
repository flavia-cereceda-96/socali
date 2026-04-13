import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EventPhotosProps {
  eventId: string;
}

export const EventPhotos = ({ eventId }: EventPhotosProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['event-photos', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.username]));

      return data.map(p => ({
        ...p,
        username: profileMap.get(p.user_id) || 'Unknown',
        url: supabase.storage.from('event-photos').getPublicUrl(p.storage_path).data.publicUrl,
      }));
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('event-photos')
          .upload(path, file);

        if (uploadErr) { toast.error(uploadErr.message); continue; }

        const { error: insertErr } = await supabase.from('event_photos').insert({
          event_id: eventId,
          user_id: user.id,
          storage_path: path,
        });

        if (insertErr) toast.error(insertErr.message);
      }

      toast.success('Photos uploaded! 📸');
      queryClient.invalidateQueries({ queryKey: ['event-photos', eventId] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string, storagePath: string) => {
    await supabase.storage.from('event-photos').remove([storagePath]);
    const { error } = await supabase.from('event_photos').delete().eq('id', photoId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['event-photos', eventId] });
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Photos {photos.length > 0 && `(${photos.length})`}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {uploading ? 'Uploading...' : 'Add'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading photos...</p>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No photos yet — add some memories!</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer"
              onClick={() => setLightbox(photo.url)}
            >
              <img
                src={photo.url}
                alt={`Photo by ${photo.username}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {currentUserId === photo.user_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id, photo.storage_path); }}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
};
