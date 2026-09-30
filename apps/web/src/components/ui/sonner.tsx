import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        error: <CircleAlertIcon className="size-4 text-danger" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border !border-border-strong !bg-popover !px-3.5 !py-3 !text-sm !text-foreground !shadow-overlay !font-sans !gap-2.5',
          title: '!font-medium',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !h-7 !rounded-md !text-xs',
        },
      }}
    />
  );
}
