import { Building2, Crown, HeartHandshake, Lock, Users } from 'lucide-react';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession, workspaceName, type TeamId } from '@/lib/session';
import { cn } from '@/lib/utils';

/** What each team unlocks in Cairn. The row permissions in Appwrite are the source of truth. */
const TEAMS: { id: TeamId; name?: string; icon: typeof Users; unlocks: string[] }[] = [
  { id: 'workspace', icon: Building2, unlocks: ['Accounts and contacts', 'Workspace notes'] },
  {
    id: 'sales',
    name: 'Sales',
    icon: Users,
    unlocks: ['Deals and the pipeline', 'Managers update every deal'],
  },
  { id: 'success', name: 'Customer Success', icon: HeartHandshake, unlocks: ['No extra records'] },
  {
    id: 'leadership',
    name: 'Leadership',
    icon: Crown,
    unlocks: ['Leadership notes', 'Confidential accounts'],
  },
];

export function AccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useSession();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px]"
        // Focus the dialog itself, so the close button does not show a focus ring on open.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Your access</DialogTitle>
          <DialogDescription>
            Your teams decide which records you can open in Cairn. Appwrite checks them on every
            request.
          </DialogDescription>
        </DialogHeader>

        <ul className="mx-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {TEAMS.map((team) => {
            const membership = session.memberships.find((m) => m.team.$id === team.id);
            const Icon = team.icon;
            const name = team.name ?? workspaceName(session);
            return (
              <li key={team.id} className="flex items-start gap-3 bg-surface px-3.5 py-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-7 shrink-0 place-items-center rounded-md ring-1 ring-inset',
                    membership
                      ? team.id === 'leadership'
                        ? 'bg-violet/14 text-violet ring-violet/20'
                        : 'bg-raised text-foreground ring-border-strong'
                      : 'bg-transparent text-subtle ring-border',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('text-sm font-medium', !membership && 'text-muted-foreground')}
                    >
                      {name}
                    </span>
                    {membership ? (
                      membership.roles.map((role) => (
                        <Badge key={role} tone={team.id === 'leadership' ? 'violet' : 'neutral'}>
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-subtle">Not a member</span>
                    )}
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {team.unlocks.map((item) => (
                      <li
                        key={item}
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          membership ? 'text-muted-foreground' : 'text-subtle',
                        )}
                      >
                        {!membership && <Lock className="size-3" aria-label="Locked" />}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center gap-2.5 border-t border-border bg-surface/60 px-5 py-3.5 text-sm text-muted-foreground">
          <ScoutMark size={20} />
          Scout uses your access. It can only read and change what you can.
        </div>
      </DialogContent>
    </Dialog>
  );
}
