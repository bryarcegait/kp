"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, PlusSquare, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileLikeDevice() {
  const userAgent = navigator.userAgent;
  const isTouchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    isTouchMac
  );
}

function getPlatform() {
  const userAgent = navigator.userAgent;
  const isTouchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent) || isTouchMac) return "ios";
  return "other";
}

export function InstallShortcutPrompt({ userId }: { userId: string }) {
  const storageKey = useMemo(
    () => `kp-install-shortcut-prompt-dismissed:${userId}`,
    [userId]
  );
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (isStandaloneMode() || !isMobileLikeDevice()) return;
    if (window.localStorage.getItem(storageKey) === "1") return;

    const timeout = window.setTimeout(() => {
      setPlatform(getPlatform());
      setOpen(true);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  function dismiss() {
    window.localStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  async function createShortcut() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
      return;
    }

    setInstallEvent(null);
  }

  const canUseNativePrompt = Boolean(installEvent);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }

        dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Smartphone className="size-7" />
          </div>
          <DialogTitle>Create phone shortcut?</DialogTitle>
          <DialogDescription>
            Open Kanto&apos;t Pakpakan faster from your phone home screen.
          </DialogDescription>
        </DialogHeader>

        {canUseNativePrompt ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Your browser can create the shortcut automatically.
          </div>
        ) : platform === "ios" ? (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-start gap-3">
              <Share className="mt-0.5 size-4 text-primary" />
              <span>Tap Share in Safari.</span>
            </div>
            <div className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 size-4 text-primary" />
              <span>Choose Add to Home Screen.</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-start gap-3">
              <ExternalLink className="mt-0.5 size-4 text-primary" />
              <span>Open the browser menu.</span>
            </div>
            <div className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 size-4 text-primary" />
              <span>Choose Add to Home Screen or Install app.</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            Not now
          </Button>
          {canUseNativePrompt ? (
            <Button type="button" onClick={createShortcut}>
              <Download className="size-4" />
              Create shortcut
            </Button>
          ) : (
            <Button type="button" onClick={dismiss}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
