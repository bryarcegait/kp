"use client";

import { OAuthButtons } from "@/components/loyalty-card/oauth-buttons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const hasProvider = googleEnabled || facebookEnabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log in to your eLoyalty Card</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Log in or create your card instantly with Google or Facebook.
          </p>
        </DialogHeader>

        {hasProvider ? (
          <OAuthButtons googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Sign-in isn&apos;t available right now. Please check back shortly.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
