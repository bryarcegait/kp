"use client";

import { useActionState, useEffect, useRef } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { syncPosReport } from "@/app/(app)/cash-summary/actions";
import { Button } from "@/components/ui/button";

type SyncPosState = {
  error?: string;
};

const initialState: SyncPosState = {};

export function SyncPosButton({
  businessDate,
  canManage,
}: {
  businessDate: string;
  canManage: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: SyncPosState, formData: FormData) => {
      return syncPosReport(formData);
    },
    initialState
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) {
        toast.error(state.error);
      } else {
        toast.success("POS data synced");
      }
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  if (!canManage) return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="businessDate" value={businessDate} />
      <Button type="submit" variant="outline" disabled={isPending}>
        <RefreshCcw className="size-4" />
        {isPending ? "Syncing..." : "Sync POS Data"}
      </Button>
    </form>
  );
}
