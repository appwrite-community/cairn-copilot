import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronsUpDown, LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { account, realtime } from '@/lib/appwrite';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { AccessDialog } from './AccessDialog';

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [accessOpen, setAccessOpen] = useState(false);

  async function signOut() {
    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch {
      toast.error("Couldn't sign out. Check your connection and try again.");
      return;
    }
    await realtime.disconnect();
    queryClient.clear();
    await navigate({ to: '/sign-in' });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-raised',
            collapsed ? 'size-9 justify-center' : 'h-11 w-full px-2',
          )}
        >
          <Avatar name={user.name} size="md" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-4">{user.name}</span>
                <span className="block truncate text-xs text-subtle">{user.prefs.title}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-subtle" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60">
          <DropdownMenuLabel>
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs font-normal text-subtle">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAccessOpen(true)}>
            <ShieldCheck />
            Your access
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={signOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccessDialog open={accessOpen} onOpenChange={setAccessOpen} />
    </>
  );
}
