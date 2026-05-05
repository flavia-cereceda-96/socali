import { useNavigate } from 'react-router-dom';
import { useMyBucketLists } from '@/hooks/useBucketList';
import { UserAvatar } from '@/components/UserAvatar';
import { GroupAvatar } from '@/components/GroupAvatar';

export function BucketListsRow({ title = 'Bucket lists' }: { title?: string }) {
  const navigate = useNavigate();
  const { data = [] } = useMyBucketLists();
  const visible = data.filter(d => (d.total_count || 0) > 0);
  if (visible.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {visible.map(list => (
            <button
              key={list.id}
              onClick={() =>
                list.type === 'friend'
                  ? navigate(`/person/${list.other_user_id}#bucket-list`)
                  : navigate(`/people/groups/${list.group_id}#bucket-list`)
              }
              className="w-56 flex-shrink-0 rounded-2xl bg-card p-3 shadow-card text-left hover:shadow-elevated transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                {list.type === 'friend' ? (
                  <UserAvatar avatarUrl={list.avatar_url} username={list.name} size="sm" />
                ) : (
                  <GroupAvatar avatarUrl={list.avatar_url} emoji={list.emoji || '👯'} name={list.name || 'Group'} size="sm" />
                )}
                <span className="font-semibold text-sm text-foreground truncate flex-1">{list.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {list.done_count}/{list.total_count}
                </span>
              </div>
              <ul className="space-y-1">
                {(list.preview_items || []).slice(0, 2).map(it => (
                  <li key={it.id} className="flex items-center gap-1.5 text-xs text-foreground/80 truncate">
                    <span>{it.emoji || '✨'}</span>
                    <span className="truncate">{it.title}</span>
                  </li>
                ))}
                {(list.preview_items || []).length === 0 && (
                  <li className="text-xs text-muted-foreground">All done — add a new one!</li>
                )}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}