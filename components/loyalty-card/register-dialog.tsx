"use client";

import { FormEvent, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { signupCustomerLoyalty } from "@/app/customer-loyalty-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function RegisterDialog({
  open,
  onOpenChange,
  onSwitchToLogin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
}) {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signupCustomerLoyalty(formData);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSuccessMessage(result.message ?? "Account created! Check your email to verify.");
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError("");
      setSuccessMessage("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for your eLoyalty Card</DialogTitle>
        </DialogHeader>

        {successMessage ? (
          <div className="grid place-items-center gap-3 py-6 text-center">
            <Mail className="size-10 text-[#c45a23]" />
            <p className="font-medium">{successMessage}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleOpenChange(false);
                onSwitchToLogin();
              }}
            >
              Go to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="register-nickname">Nickname</Label>
              <Input id="register-nickname" name="nickname" required autoComplete="nickname" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-email">Email</Label>
              <Input id="register-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-password">Password</Label>
              <PasswordInput
                id="register-password"
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-confirm">Confirm password</Label>
              <PasswordInput
                id="register-confirm"
                name="confirmPassword"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create my card
            </Button>
            <button
              type="button"
              onClick={() => {
                handleOpenChange(false);
                onSwitchToLogin();
              }}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Already have a card? Log in
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
