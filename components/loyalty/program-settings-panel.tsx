"use client";

import { useActionState, useEffect, useRef } from "react";
import { Gift, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deactivateLoyaltyReward,
  updateLoyaltySettings,
  upsertLoyaltyReward,
  type LoyaltyFormState,
} from "@/app/(app)/loyalty/actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoyaltyFormState = {};

function useFormToast(state: LoyaltyFormState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

export function ProgramSettingsPanel({
  spendPerStamp,
  rewardTiers,
}: {
  spendPerStamp: number;
  rewardTiers: { stamps: number; name: string }[];
}) {
  const [settingsState, settingsAction, isSavingSettings] = useActionState(
    updateLoyaltySettings,
    initialState
  );
  const [rewardState, rewardAction, isSavingReward] = useActionState(
    upsertLoyaltyReward,
    initialState
  );
  const [deactivateState, deactivateAction, isDeactivating] = useActionState(
    deactivateLoyaltyReward,
    initialState
  );
  useFormToast(settingsState, isSavingSettings);
  useFormToast(rewardState, isSavingReward);
  useFormToast(deactivateState, isDeactivating);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Earning rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={settingsAction} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="spendPerStamp">Pesos per stamp</Label>
              <Input
                id="spendPerStamp"
                name="spendPerStamp"
                type="number"
                step="0.01"
                min="1"
                defaultValue={spendPerStamp}
                required
              />
              <p className="text-xs text-muted-foreground">
                Currently {formatCurrency(spendPerStamp)} spent = 1 stamp. Partial amounts carry
                over to the next visit.
              </p>
            </div>
            {settingsState.error ? (
              <p className="text-sm font-medium text-destructive">{settingsState.error}</p>
            ) : null}
            <Button type="submit" disabled={isSavingSettings}>
              <Save className="size-4" />
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reward tiers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            {rewardTiers.map((reward) => (
              <form
                key={reward.stamps}
                action={deactivateAction}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Gift className="size-4 text-primary" />
                  <span className="font-medium">{reward.stamps} stamps</span>
                  <span className="text-sm text-muted-foreground">{reward.name}</span>
                </div>
                <input type="hidden" name="stampsRequired" value={reward.stamps} />
                <Button type="submit" variant="ghost" size="icon" disabled={isDeactivating}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </form>
            ))}
            {rewardTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reward tiers configured yet.</p>
            ) : null}
          </div>

          <form action={rewardAction} className="grid gap-3 border-t pt-4">
            <p className="text-sm font-medium">Add or update a tier</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="stampsRequired">Stamps needed</Label>
                <Input id="stampsRequired" name="stampsRequired" type="number" min="1" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rewardName">Reward</Label>
                <Input id="rewardName" name="rewardName" placeholder="e.g. Free drink" required />
              </div>
            </div>
            {rewardState.error ? (
              <p className="text-sm font-medium text-destructive">{rewardState.error}</p>
            ) : null}
            <Button type="submit" variant="outline" disabled={isSavingReward}>
              <Save className="size-4" />
              Save tier
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
