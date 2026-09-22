"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/auth/FormField";
import { getSafeRedirect } from "@/lib/utils/safeRedirect";
import type { AuthResponse } from "@/types/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const from = getSafeRedirect(searchParams.get("from"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await response.json()) as AuthResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      router.push(from ?? (data.user.role === "admin" ? "/admin" : "/"));
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-500">
          This reset link is missing its token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="password"
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
        autoComplete="new-password"
        placeholder="At least 6 characters"
      />
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
        placeholder="Re-enter your new password"
      />

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
