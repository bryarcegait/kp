"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { Camera, CheckCircle2, Gift, Loader2, ScanLine, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  awardLoyaltyStamps,
  findCustomerByLoyaltyCode,
  redeemLoyaltyReward,
  type AwardLoyaltyState,
  type LoyaltyFormState,
} from "@/app/(app)/loyalty/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ResolvedCustomer = {
  id: string;
  displayName: string;
  loyaltyPoints: number;
  redeemableRewards: { stamps: number; name: string }[];
};

const initialRedeemState: LoyaltyFormState = {};

function ClaimRewardSection({
  customer,
  onClaimed,
}: {
  customer: ResolvedCustomer;
  onClaimed: () => void;
}) {
  const [state, formAction, isPending] = useActionState(redeemLoyaltyReward, initialRedeemState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) {
        toast.success(state.success);
        onClaimed();
      }
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error, state.success]);

  if (customer.redeemableRewards.length === 0) return null;

  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Gift className="size-4 text-primary" />
        Reward ready to claim
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {customer.redeemableRewards.map((reward) => (
          <form key={reward.stamps} action={formAction}>
            <input type="hidden" name="customerId" value={customer.id} />
            <input type="hidden" name="rewardStamps" value={reward.stamps} />
            <Button type="submit" variant="outline" className="w-full justify-start" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
              {reward.name}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}

const initialAwardState: AwardLoyaltyState = {};

function ConfirmAndAward({
  customer,
  loyaltyCode,
  source,
  onReset,
}: {
  customer: ResolvedCustomer;
  loyaltyCode: string;
  source: "in_store" | "online";
  onReset: () => void;
}) {
  const [state, formAction, isPending] = useActionState(awardLoyaltyStamps, initialAwardState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.message) toast.success(state.message);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.message]);

  useEffect(() => {
    if (!isPending && state.success) {
      const timeout = setTimeout(onReset, 2500);
      return () => clearTimeout(timeout);
    }
  }, [isPending, state.success, onReset]);

  if (state.success) {
    return (
      <div className="grid place-items-center gap-3 rounded-lg border bg-emerald-50 p-6 text-center dark:bg-emerald-950/30">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="font-semibold">{customer.displayName}</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Scan next customer
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{customer.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {customer.loyaltyPoints} current stamp{customer.loyaltyPoints === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onReset}>
          <X className="size-4" />
        </Button>
      </div>

      <ClaimRewardSection customer={customer} onClaimed={onReset} />

      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="loyaltyCode" value={loyaltyCode} />
        <input type="hidden" name="source" value={source} />
        <div className="grid gap-2">
          <Label htmlFor="award-amount">Order amount (₱)</Label>
          <Input id="award-amount" name="amount" type="number" step="0.01" min="0.01" required autoFocus />
        </div>
        {state.error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Award stamps
        </Button>
      </form>
    </div>
  );
}

function useResolveLoyaltyCode() {
  const [customer, setCustomer] = useState<ResolvedCustomer | null>(null);
  const [error, setError] = useState("");
  const [isResolving, startTransition] = useTransition();
  const resolvedCodeRef = useRef<string | null>(null);

  function resolve(loyaltyCode: string) {
    if (resolvedCodeRef.current === loyaltyCode) return;
    resolvedCodeRef.current = loyaltyCode;
    setError("");
    startTransition(async () => {
      const result = await findCustomerByLoyaltyCode(loyaltyCode);
      if ("error" in result && result.error) {
        setError(result.error);
        resolvedCodeRef.current = null;
        return;
      }
      if ("customer" in result && result.customer) {
        setCustomer(result.customer);
      }
    });
  }

  function reset() {
    setCustomer(null);
    setError("");
    resolvedCodeRef.current = null;
  }

  return { customer, error, isResolving, resolve, reset };
}

function CameraScanTab() {
  const { customer, error, isResolving, resolve, reset } = useResolveLoyaltyCode();
  const [loyaltyCode, setLoyaltyCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);

  function stopCamera() {
    setIsScanning(false);
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser doesn't support camera access. Use the Online order tab instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setIsScanning(true);
    } catch {
      setCameraError("Could not access the camera. Check browser permissions.");
    }
  }

  useEffect(() => {
    if (!isScanning || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      setCameraError("Could not start the camera preview. Check browser permissions.");
      stopCamera();
    });
  }, [isScanning]);

  useEffect(() => {
    if (!isScanning) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext("2d");

    function tick() {
      if (video && canvas && context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          setLoyaltyCode(code.data);
          resolve(code.data);
          stopCamera();
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  useEffect(() => () => stopCamera(), []);

  function handleReset() {
    reset();
    setLoyaltyCode("");
  }

  if (customer) {
    return (
      <ConfirmAndAward customer={customer} loyaltyCode={loyaltyCode} source="in_store" onReset={handleReset} />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border bg-muted">
        <video
          ref={videoRef}
          className={`size-full object-cover ${isScanning ? "" : "hidden"}`}
          muted
          autoPlay
          playsInline
        />
        {!isScanning ? <Camera className="size-10 text-muted-foreground" /> : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {isResolving ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Looking up customer...
        </p>
      ) : null}
      {error || cameraError ? (
        <p className="text-sm font-medium text-destructive">{error || cameraError}</p>
      ) : null}
      <Button type="button" onClick={isScanning ? stopCamera : startCamera} variant={isScanning ? "outline" : "default"}>
        <ScanLine className="size-4" />
        {isScanning ? "Stop scanning" : "Start camera scan"}
      </Button>
    </div>
  );
}

function UploadScanTab() {
  const { customer, error, isResolving, resolve, reset } = useResolveLoyaltyCode();
  const [loyaltyCode, setLoyaltyCode] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setDecodeError("");
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code?.data) {
      setDecodeError("Couldn't find a QR code in that image. Try a clearer screenshot.");
      return;
    }
    setLoyaltyCode(code.data);
    resolve(code.data);
  }

  function handleReset() {
    reset();
    setLoyaltyCode("");
    setDecodeError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (customer) {
    return (
      <ConfirmAndAward customer={customer} loyaltyCode={loyaltyCode} source="online" onReset={handleReset} />
    );
  }

  return (
    <div className="grid gap-3">
      <label className="grid aspect-square cursor-pointer place-items-center gap-2 rounded-lg border border-dashed bg-muted/40 text-center text-sm text-muted-foreground hover:bg-muted">
        <Upload className="size-8" />
        <span>Upload the customer&apos;s QR screenshot</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {isResolving ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Looking up customer...
        </p>
      ) : null}
      {error || decodeError ? (
        <p className="text-sm font-medium text-destructive">{error || decodeError}</p>
      ) : null}
    </div>
  );
}

export function ScanAwardPanel() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="in-store">
          <TabsList>
            <TabsTrigger value="in-store">In-store scan</TabsTrigger>
            <TabsTrigger value="online">Online order</TabsTrigger>
          </TabsList>
          <TabsContent value="in-store" className="mt-4">
            <CameraScanTab />
          </TabsContent>
          <TabsContent value="online" className="mt-4">
            <UploadScanTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
