import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppwriteException } from 'appwrite';
import { CalendarDays, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AccountTile } from '@/components/shared/Badges';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input, Label } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip } from '@/components/ui/tooltip';
import { table, tablesDB } from '@/lib/appwrite';
import { formatDateOnly, parseDateOnly, toDateOnly } from '@/lib/dates';
import { formatCurrency, STAGE_LABELS, STAGES } from '@/lib/format';
import { quietFlash } from '@/lib/highlight';
import { useSession } from '@/lib/session';
import type { Deal, Stage } from '@/lib/types';
import { UpdatedByScout } from './DealCard';
import { dealAccess } from './dealAccess';
import { StageIcon } from './StageIcon';

export function DealSheet({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  return (
    <Sheet open={deal !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="p-0 sm:max-w-[420px]">
        {deal && <DealForm key={deal.$id} deal={deal} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function DealForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { canEdit, reason } = dealAccess(deal, session);

  const [stage, setStage] = useState<Stage>(deal.stage);
  const [closeDate, setCloseDate] = useState(deal.closeDate);
  const [nextStep, setNextStep] = useState(deal.nextStep ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Send only the fields that changed.
  const changes: Partial<Pick<Deal, 'stage' | 'closeDate' | 'nextStep'>> = {};
  if (stage !== deal.stage) changes.stage = stage;
  if (closeDate.slice(0, 10) !== deal.closeDate.slice(0, 10)) changes.closeDate = closeDate;
  if (nextStep.trim() !== (deal.nextStep ?? '')) changes.nextStep = nextStep.trim() || null;
  const hasChanges = Object.keys(changes).length > 0;

  const update = useMutation({
    mutationFn: () =>
      tablesDB.updateRow<Deal>({
        ...table('deals'),
        rowId: deal.$id,
        data: { ...changes, updatedByName: session.user.name, updatedVia: 'app' },
      }),
    onMutate: () => quietFlash(deal.$id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal updated');
      onDone();
    },
    onError: (err) =>
      toast.error(
        err instanceof AppwriteException && err.code === 401
          ? "You don't have permission to update this deal."
          : "Couldn't update the deal. Try again.",
      ),
  });

  const disabled = !canEdit || update.isPending;

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (canEdit && hasChanges) update.mutate();
      }}
    >
      <div className="border-b border-border px-5 pb-4 pt-5">
        <Link
          to="/accounts/$accountId"
          params={{ accountId: deal.accountId }}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:underline"
        >
          <AccountTile name={deal.accountName} size="sm" />
          {deal.accountName}
        </Link>
        <SheetTitle className="mt-3 pr-8 text-lg font-semibold leading-6 tracking-[-0.01em]">
          {deal.name}
        </SheetTitle>
        <SheetDescription asChild>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular">
              {formatCurrency(deal.amount)}
            </span>
            <span className="flex items-center gap-1.5">
              <Avatar name={deal.ownerName} size="xs" />
              {deal.ownerName}
            </span>
          </div>
        </SheetDescription>
        {deal.updatedVia === 'scout' && deal.updatedByName && <UpdatedByScout deal={deal} />}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {!canEdit && (
          <p className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-warning" />
            {reason}
          </p>
        )}
        <Field label="Stage" htmlFor="deal-stage" reason={reason}>
          <Select
            value={stage}
            onValueChange={(value) => setStage(value as Stage)}
            disabled={disabled}
          >
            <SelectTrigger id="deal-stage" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((value) => (
                <SelectItem key={value} value={value}>
                  <StageIcon stage={value} />
                  {STAGE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Close date" htmlFor="deal-close" reason={reason}>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild disabled={disabled}>
              <button
                id="deal-close"
                type="button"
                className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-raised px-2.5 text-left text-sm outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays className="size-4 text-subtle" />
                {formatDateOnly(closeDate, 'long')}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                required
                selected={parseDateOnly(closeDate)}
                defaultMonth={parseDateOnly(closeDate)}
                onSelect={(date) => {
                  setCloseDate(toDateOnly(date));
                  setPickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </Field>

        <Field label="Next step" htmlFor="deal-next" reason={reason}>
          <Input
            id="deal-next"
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
            maxLength={256}
            placeholder="What happens next"
            disabled={disabled}
            className="h-9"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {reason ? (
          <Tooltip content={reason}>
            <span className="inline-flex">
              <Button type="submit" disabled>
                Update
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button type="submit" disabled={disabled || !hasChanges}>
            Update
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  reason,
  children,
}: {
  label: string;
  htmlFor: string;
  reason: string | null;
  children: React.ReactNode;
}) {
  const field = <div className="flex flex-col gap-1.5">{children}</div>;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {reason ? (
        <Tooltip content={reason} side="bottom" align="start">
          {field}
        </Tooltip>
      ) : (
        field
      )}
    </div>
  );
}
