"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePassword, type ChangePasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: ChangePasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving..." : "Change Password"}
    </Button>
  );
}

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState(changePassword, initialState);

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
          <CardTitle className="text-xl">Change Password</CardTitle>
          <CardDescription>
            Enter a new password before using the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
              {state.fieldErrors?.password ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.password}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={6}
                required
              />
              {state.fieldErrors?.confirmPassword ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>
            {state.error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
