import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { table, tablesDB } from '@/lib/appwrite';
import { quietFlash } from '@/lib/highlight';
import { tasksQuery } from '@/lib/queries';
import type { Task } from '@/lib/types';

/** Ticks a task off (or back on) right away, and rolls back if Appwrite rejects it. */
export function useToggleTask() {
  const queryClient = useQueryClient();
  const key = tasksQuery.queryKey;

  return useMutation({
    mutationFn: ({ task, done }: { task: Task; done: boolean }) =>
      tablesDB.updateRow<Task>({ ...table('tasks'), rowId: task.$id, data: { done } }),
    onMutate: async ({ task, done }) => {
      quietFlash(task.$id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (tasks) =>
        tasks?.map((t) => (t.$id === task.$id ? { ...t, done } : t)),
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error("Couldn't update the task. Try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
