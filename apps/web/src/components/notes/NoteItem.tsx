import { Mail, Phone, StickyNote, Users, type LucideIcon } from 'lucide-react';
import { Flash } from '@/components/Flash';
import { ViaScout, VisibilityBadge } from '@/components/shared/Badges';
import { RelativeTime } from '@/components/shared/DateText';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { KIND_LABELS } from '@/lib/format';
import { visibilityOf } from '@/lib/permissions';
import type { Note, NoteKind } from '@/lib/types';
import { cn } from '@/lib/utils';

export const KIND_ICONS: Record<NoteKind, LucideIcon> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  internal: StickyNote,
};

export function NoteItem({
  note,
  showAccount = false,
  className,
}: {
  note: Note;
  showAccount?: boolean;
  className?: string;
}) {
  const KindIcon = KIND_ICONS[note.kind];
  return (
    <article
      data-row-id={note.$id}
      className={cn('relative rounded-xl border border-border bg-surface px-4 py-3.5', className)}
    >
      <Flash rowId={note.$id} />
      <header className="flex items-center gap-2">
        <Avatar name={note.authorName} size="sm" />
        <span className="truncate text-sm font-medium">{note.authorName}</span>
        <Tooltip content={KIND_LABELS[note.kind]}>
          <span
            className="grid size-5 place-items-center text-subtle"
            aria-label={KIND_LABELS[note.kind]}
          >
            <KindIcon className="size-3.5" />
          </span>
        </Tooltip>
        <RelativeTime iso={note.$createdAt} className="text-xs text-subtle" />
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {note.source === 'scout' && <ViaScout />}
          <VisibilityBadge visibility={visibilityOf(note)} />
        </span>
      </header>
      {showAccount && (
        <p className="mt-2 text-xs font-medium text-muted-foreground">{note.accountName}</p>
      )}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-[21px] text-[#d6d6dc]">
        {note.body}
      </p>
    </article>
  );
}
