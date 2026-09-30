import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function Calendar({ className, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col',
        month: 'flex flex-col gap-3',
        month_caption: 'flex h-7 items-center justify-center',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'grid size-7 place-items-center rounded-md text-subtle outline-none transition-colors hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
        button_next:
          'grid size-7 place-items-center rounded-md text-subtle outline-none transition-colors hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 text-center text-xs font-normal text-subtle',
        week: 'mt-1 flex w-full',
        day: 'group size-8 p-0 text-center text-sm',
        day_button:
          'size-8 rounded-md tabular outline-none transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring/60 group-data-[selected=true]:bg-primary group-data-[selected=true]:font-medium group-data-[selected=true]:text-primary-foreground',
        today: 'text-primary',
        outside: 'text-subtle/60',
        disabled: 'opacity-40',
        hidden: 'invisible',
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
