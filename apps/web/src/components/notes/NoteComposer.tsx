import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ID } from 'appwrite';
import { Lock, ShieldCheck, Users } from 'lucide-react';
import { useState, type KeyboardEvent, type Ref } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { table, tablesDB } from '@/lib/appwrite';
import { KIND_LABELS } from '@/lib/format';
import { modKey } from '@/lib/keyboard';
import { notePermissions, type Visibility } from '@/lib/permissions';
import { inTeam, useSession } from '@/lib/session';
import type { Account, Note, NoteKind } from '@/lib/types';
import { KIND_ICONS } from './NoteItem';

const MAX_NOTE_LENGTH = 2000;

export function NoteComposer({
  account,
  ref,
}: {
  account: Account;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<NoteKind>('call');
  const [visibility, setVisibility] = useState<Visibility>('workspace');
  // Users can only share with teams they belong to. Appwrite enforces it; the
  // menu just leaves out an option that would fail.
  const canShareWithLeadership = inTeam(session, 'leadership');

  const addNote = useMutation({
    mutationFn: () =>
      tablesDB.createRow<Note>({
        ...table('notes'),
        rowId: ID.unique(),
        data: {
          accountId: account.$id,
          accountName: account.name,
          body: body.trim(),
          kind,
          authorId: session.user.$id,
          authorName: session.user.name,
          source: 'app',
        },
        permissions: notePermissions(visibility, session.user.$id),
      }),
    onSuccess: () => {
      setBody('');
      toast.success('Note added');
      return queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error("Couldn't add the note. Try again."),
  });

  const canSubmit = body.trim().length > 0 && body.length <= MAX_NOTE_LENGTH && !addNote.isPending;

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && canSubmit) {
      event.preventDefault();
      addNote.mutate();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) addNote.mutate();
      }}
      className="rounded-xl border border-border bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-border-strong"
    >
      <label htmlFor="note-body" className="sr-only">
        Note
      </label>
      <textarea
        id="note-body"
        ref={ref}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        maxLength={MAX_NOTE_LENGTH}
        placeholder={`Add a note about ${account.name}`}
        className="block min-h-[64px] w-full resize-none bg-transparent px-4 pt-3 text-sm leading-[21px] outline-none placeholder:text-subtle"
      />
      <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-1">
        <Select value={kind} onValueChange={(value) => setKind(value as NoteKind)}>
          <SelectTrigger
            className="h-7 w-auto gap-1.5 border-transparent bg-raised px-2 text-xs"
            aria-label="Note type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABELS) as NoteKind[]).map((value) => {
              const Icon = KIND_ICONS[value];
              return (
                <SelectItem key={value} value={value}>
                  <Icon className="size-3.5" />
                  {KIND_LABELS[value]}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
          <SelectTrigger
            className="h-7 w-auto gap-1.5 border-transparent bg-raised px-2 text-xs"
            aria-label="Who can read this note"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">
              <Users className="size-3.5" />
              Workspace
            </SelectItem>
            <SelectItem value="private">
              <Lock className="size-3.5" />
              Only me
            </SelectItem>
            {canShareWithLeadership && (
              <SelectItem value="leadership">
                <ShieldCheck className="size-3.5" />
                Leadership
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <span className="ml-auto hidden items-center gap-0.5 text-xs text-subtle sm:flex">
          <Kbd>{modKey}</Kbd>
          <Kbd>↵</Kbd>
        </span>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          Add note
        </Button>
      </div>
    </form>
  );
}
