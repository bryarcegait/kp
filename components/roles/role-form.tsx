"use client";

import { useActionState, useEffect, useRef } from "react";
import { upsertRole, type RoleFormState } from "@/app/(app)/roles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSIONS, PERMISSION_MODULES } from "@/lib/permissions";

export type RoleFormValues = {
  id: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
  isSystem: boolean;
};

const initialState: RoleFormState = {};

export function RoleForm({
  role,
  onSuccess,
}: {
  role?: RoleFormValues | null;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(upsertRole, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const checked = new Set(role?.permissionKeys ?? []);

  return (
    <form action={formAction} className="grid gap-4">
      {role ? <input type="hidden" name="id" value={role.id} /> : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Role name</Label>
        <Input id="name" name="name" defaultValue={role?.name} required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={role?.description ?? ""} rows={2} />
      </div>

      <div className="grid gap-3">
        <Label>Permissions</Label>
        <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
          {PERMISSION_MODULES.map((module) => (
            <div key={module} className="grid gap-2">
              <p className="text-sm font-medium">{module}</p>
              {PERMISSIONS.filter((p) => p.module === module).map((permission) => (
                <label
                  key={permission.key}
                  className="flex items-center gap-2 text-sm font-normal"
                >
                  <Checkbox
                    name="permissions"
                    value={permission.key}
                    defaultChecked={checked.has(permission.key)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : role ? "Save changes" : "Create role"}
      </Button>
    </form>
  );
}
