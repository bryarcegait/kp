"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upsertUser, type UserFormState } from "@/app/(app)/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UserFormValues = {
  id: string;
  fullName: string;
  username: string;
  birthday?: string | null;
  dateHired?: string | null;
  roleId: string;
  isActive: boolean;
  mustChangePassword: boolean;
};

const initialState: UserFormState = {};

export function UserForm({
  user,
  roles,
  onSuccess,
}: {
  user?: UserFormValues | null;
  roles: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(upsertUser, initialState);
  const wasPending = useRef(false);
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? "");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={user?.fullName} required />
        {state.fieldErrors?.fullName ? (
          <p className="text-sm text-destructive">{state.fieldErrors.fullName}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={user?.username} required />
        {state.fieldErrors?.username ? (
          <p className="text-sm text-destructive">{state.fieldErrors.username}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder={user ? "Leave blank to keep current password" : ""}
          minLength={6}
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={user?.birthday ?? ""}
          />
          {state.fieldErrors?.birthday ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.birthday}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateHired">Date Hired</Label>
          <Input
            id="dateHired"
            name="dateHired"
            type="date"
            defaultValue={user?.dateHired ?? ""}
          />
          {state.fieldErrors?.dateHired ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.dateHired}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.roleId ? (
          <p className="text-sm text-destructive">{state.fieldErrors.roleId}</p>
        ) : null}
      </div>

      {user ? (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="active-switch">Active</Label>
            <p className="text-xs text-muted-foreground">Inactive users can&apos;t sign in.</p>
          </div>
          <Switch id="active-switch" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : user ? "Save changes" : "Create user"}
      </Button>
    </form>
  );
}
