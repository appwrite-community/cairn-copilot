import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  PanelLeft,
  SquareCheckBig,
  SquareKanban,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { ScoutMark } from '@/components/brand/ScoutMark';
import { useScout } from '@/components/scout/ScoutProvider';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip } from '@/components/ui/tooltip';
import { daysFromToday } from '@/lib/dates';
import { modKey } from '@/lib/keyboard';
import { tasksQuery } from '@/lib/queries';
import { useSession, workspaceName } from '@/lib/session';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';

type NavItem = { to: '/' | '/accounts' | '/pipeline' | '/tasks'; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/accounts', label: 'Accounts', icon: Building2 },
  { to: '/pipeline', label: 'Pipeline', icon: SquareKanban },
  { to: '/tasks', label: 'Tasks', icon: SquareCheckBig },
];

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called after a link is chosen, so the mobile menu can close. */
  onNavigate?: () => void;
}) {
  const session = useSession();
  const scout = useScout();
  const { data: tasks } = useQuery(tasksQuery);
  const dueCount = (tasks ?? []).filter((t) => !t.done && daysFromToday(t.dueDate) <= 0).length;

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex h-full flex-col gap-1 bg-sidebar px-3 pb-3 pt-3.5',
        collapsed ? 'items-center px-2' : '',
      )}
    >
      <div
        className={cn(
          'flex h-8 items-center',
          collapsed ? 'justify-center' : 'justify-between pl-1.5',
        )}
      >
        {collapsed ? (
          <Tooltip content="Lumina Analytics" side="right">
            <Link
              to="/"
              aria-label="Cairn home"
              onClick={onNavigate}
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <LogoMark />
            </Link>
          </Tooltip>
        ) : (
          <>
            <Link
              to="/"
              onClick={onNavigate}
              className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <LogoMark className="size-[22px]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-4 tracking-[-0.01em]">
                  {workspaceName(session)}
                </span>
                <span className="block text-[11px] leading-4 text-subtle">cairn</span>
              </span>
            </Link>
            {onToggleCollapsed && (
              <Tooltip
                content={<ShortcutHint label="Collapse sidebar" keys={[modKey, '\\']} />}
                side="right"
              >
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label="Collapse sidebar"
                  className="grid size-7 place-items-center rounded-md text-subtle outline-none transition-colors hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <PanelLeft className="size-4" />
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      <div className={cn('mt-4 flex flex-col gap-0.5', collapsed && 'items-center')}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            count={item.to === '/tasks' ? dueCount : 0}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className={cn('mt-4', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <Tooltip content={<ShortcutHint label="Ask Scout" keys={[modKey, 'J']} />} side="right">
            <button
              type="button"
              onClick={() => scout.setOpen(!scout.open)}
              aria-label="Ask Scout"
              aria-pressed={scout.open}
              className="grid size-9 place-items-center rounded-md outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <ScoutMark size={22} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => {
              scout.setOpen(!scout.open);
              onNavigate?.();
            }}
            aria-pressed={scout.open}
            className={cn(
              'group flex h-9 w-full items-center gap-2.5 rounded-lg border px-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60',
              scout.open
                ? 'border-primary/25 bg-primary/8 text-foreground'
                : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            <ScoutMark size={20} />
            Ask Scout
            <span className="ml-auto flex gap-0.5">
              <Kbd>{modKey}</Kbd>
              <Kbd>J</Kbd>
            </span>
          </button>
        )}
      </div>

      <div className={cn('mt-auto', collapsed ? 'flex justify-center' : '')}>
        <UserMenu collapsed={collapsed} />
      </div>
    </nav>
  );
}

function NavLink({
  item,
  collapsed,
  count,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  count: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === '/' }}
      className={cn(
        'group relative flex h-8 items-center gap-2.5 rounded-md text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60',
        collapsed ? 'size-9 justify-center' : 'px-2',
        'text-muted-foreground hover:bg-raised/70 hover:text-foreground',
        'data-[status=active]:bg-raised data-[status=active]:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0 text-subtle transition-colors group-hover:text-muted-foreground group-data-[status=active]:text-foreground" />
      {!collapsed && <span>{item.label}</span>}
      {count > 0 &&
        (collapsed ? (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
        ) : (
          <span className="ml-auto min-w-5 rounded-full bg-raised px-1.5 text-center text-xs tabular text-muted-foreground ring-1 ring-inset ring-border-strong group-data-[status=active]:bg-background">
            {count}
          </span>
        ))}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip content={count > 0 ? `${item.label} · ${count} due` : item.label} side="right">
      {link}
    </Tooltip>
  );
}

export function ShortcutHint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="flex items-center gap-2">
      {label}
      <span className="flex gap-0.5">
        {keys.map((key) => (
          <Kbd key={key} className="h-4 min-w-4 text-[10px]">
            {key}
          </Kbd>
        ))}
      </span>
    </span>
  );
}
