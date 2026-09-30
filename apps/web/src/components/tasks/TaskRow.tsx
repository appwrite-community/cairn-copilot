import { Link } from '@tanstack/react-router';
import { Flash } from '@/components/Flash';
import { ViaScout } from '@/components/shared/Badges';
import { CalendarDate } from '@/components/shared/DateText';
import { Checkbox } from '@/components/ui/checkbox';
import { daysFromToday, describeDue, formatDateOnly } from '@/lib/dates';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToggleTask } from './useToggleTask';

export function TaskRow({
  task,
  showAccount = true,
  className,
}: {
  task: Task;
  showAccount?: boolean;
  className?: string;
}) {
  const toggle = useToggleTask();
  const days = daysFromToday(task.dueDate);
  const id = `task-${task.$id}`;

  return (
    <div
      data-row-id={task.$id}
      className={cn(
        'group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised/50',
        className,
      )}
    >
      <Flash rowId={task.$id} />
      <Checkbox
        id={id}
        checked={task.done}
        onCheckedChange={(checked) => toggle.mutate({ task, done: checked === true })}
        className="mt-0.5"
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className={cn(
            'block cursor-pointer text-sm leading-5 transition-colors',
            task.done ? 'text-subtle line-through decoration-subtle/60' : 'text-foreground',
          )}
        >
          {task.title}
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <CalendarDate
            iso={task.dueDate}
            className={cn(
              task.done
                ? 'text-subtle'
                : days < 0
                  ? 'font-medium text-danger'
                  : days === 0
                    ? 'font-medium text-warning'
                    : 'text-muted-foreground',
            )}
          >
            {task.done ? formatDateOnly(task.dueDate) : describeDue(task.dueDate)}
          </CalendarDate>
          {showAccount && task.accountId && task.accountName && (
            <>
              <span className="text-border-strong">·</span>
              <Link
                to="/accounts/$accountId"
                params={{ accountId: task.accountId }}
                className="truncate text-muted-foreground outline-none hover:text-foreground focus-visible:underline"
              >
                {task.accountName}
              </Link>
            </>
          )}
          {task.source === 'scout' && <ViaScout />}
        </div>
      </div>
    </div>
  );
}
