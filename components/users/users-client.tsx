"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Pencil, Power } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserForm, type UserFormValues } from "./user-form";
import { resetUserPassword, setUserActive } from "@/app/(app)/users/actions";

export type UserRow = UserFormValues & { roleName: string };

export function UsersClient({
  users,
  roles,
  currentUserId,
}: {
  users: UserRow[];
  roles: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [dialogTarget, setDialogTarget] = useState<"new" | UserRow | null>(null);
  const [resetResult, setResetResult] = useState<{
    userName: string;
    tempPassword: string;
  } | null>(null);
  const [isToggling, startToggleTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();

  function handleToggle(user: UserRow) {
    startToggleTransition(async () => {
      const result = await setUserActive(user.id, !user.isActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(user.isActive ? "User deactivated" : "User activated");
      }
    });
  }

  function handleResetPassword(user: UserRow) {
    startResetTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (result.error || !result.tempPassword) {
        toast.error(result.error ?? "Unable to reset password");
      } else {
        setResetResult({
          userName: user.fullName,
          tempPassword: result.tempPassword,
        });
        toast.success("Temporary password created");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogTarget("new")}>
          <Plus className="size-4" /> Add User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Birthday</TableHead>
              <TableHead>Date Hired</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Password</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{user.username}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.birthday ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.dateHired ?? "-"}
                </TableCell>
                <TableCell>{user.roleName}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.mustChangePassword ? "destructive" : "outline"}>
                    {user.mustChangePassword ? "Change required" : "Set"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit user"
                      onClick={() => setDialogTarget(user)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reset password"
                      disabled={isResetting}
                      onClick={() => handleResetPassword(user)}
                    >
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={user.isActive ? "Deactivate user" : "Activate user"}
                      disabled={isToggling || user.id === currentUserId}
                      onClick={() => handleToggle(user)}
                    >
                      <Power
                        className={`size-4 ${user.isActive ? "text-destructive" : "text-emerald-600"}`}
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogTarget !== null} onOpenChange={(open) => !open && setDialogTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogTarget === "new" ? "Add User" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <UserForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            user={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            roles={roles}
            onSuccess={() => {
              toast.success(dialogTarget === "new" ? "User created" : "User updated");
              setDialogTarget(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={resetResult !== null} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Give this password to {resetResult?.userName}. They must change it
              after login.
            </p>
            <div className="rounded-md border bg-muted/40 p-3 text-center text-lg font-semibold tracking-wide">
              {resetResult?.tempPassword}
            </div>
            <Button
              type="button"
              onClick={() => {
                if (resetResult?.tempPassword) {
                  navigator.clipboard?.writeText(resetResult.tempPassword);
                  toast.success("Password copied");
                }
              }}
            >
              Copy Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
