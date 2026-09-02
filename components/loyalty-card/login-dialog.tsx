"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginCustomerLoyalty } from "@/app/customer-loyalty-actions";
import { OAuthButtons } from "@/components/loyalty-card/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function LoginDialog({
  open,
  onOpenChange,
  googleEnabled,
  facebookEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googleEnabled: boolean;
  facebookEnabled: boolean;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginCustomerLoyalty(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Welcome back!");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log in to your eLoyalty Card</DialogTitle>
          <p className="text-sm text-muted-foreground">
            New here? Continue with Google or Facebook below to create your card instantly.
          </p>
        </DialogHeader>

        <OAuthButtons googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <PasswordInput
              id="login-password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Log in
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
