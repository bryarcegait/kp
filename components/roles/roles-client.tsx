"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleForm, type RoleFormValues } from "./role-form";
import { deleteRole } from "@/app/(app)/roles/actions";

export type RoleRow = RoleFormValues & { userCount: number };

export function RolesClient({ roles }: { roles: RoleRow[] }) {
  const [dialogTarget, setDialogTarget] = useState<"new" | RoleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deleteRole(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role deleted");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogTarget("new")}>
          <Plus className="size-4" /> New Role
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <CardTitle className="text-base">{role.name}</CardTitle>
                </div>
                {role.isSystem ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="size-3" /> Built-in
                  </Badge>
                ) : null}
              </div>
              {role.description ? <CardDescription>{role.description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {role.permissionKeys.length} permission(s) · {role.userCount} user(s)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogTarget(role)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                {!role.isSystem ? (
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(role)}>
                    <Trash2 className="size-4 text-destructive" /> Delete
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogTarget !== null} onOpenChange={(open) => !open && setDialogTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTarget === "new" ? "New Role" : "Edit Role"}</DialogTitle>
          </DialogHeader>
          <RoleForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            role={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            onSuccess={() => {
              toast.success(dialogTarget === "new" ? "Role created" : "Role updated");
              setDialogTarget(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
