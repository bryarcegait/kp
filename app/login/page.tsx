"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { authenticate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

function LoginForm() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);
  const searchParams = useSearchParams();

  return (
    <div className="flex min-h-svh items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-sm border-white/20 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex w-full justify-center">
            <img
              src="/kanto-logo.png"
              alt="Kanto't Pakpakan"
              className="h-20 w-24 object-contain object-center"
            />
          </div>
          <CardTitle className="text-xl">Kanto&apos;t Pakpakan</CardTitle>
          <CardDescription>Sign in to manage your restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            {searchParams.get("changed") === "1" ? (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                Password changed. Please sign in again.
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            {errorMessage ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
