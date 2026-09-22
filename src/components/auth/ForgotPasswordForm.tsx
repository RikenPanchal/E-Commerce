"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormField } from "@/components/auth/FormField";
import { getSafeRedirect } from "@/lib/utils/safeRedirect";
import type { ForgotPasswordResponse } from "@/types/auth";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const from = getSafeRedirect(searchParams.get("from"));
  const signinHref = from
    ? `/signin?from=${encodeURIComponent(from)}`
    : "/signin";

  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    devResetUrl?: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as ForgotPasswordResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setResult({ message: data.message, devResetUrl: data.devResetUrl });
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/80">{result.message}</p>
        {result.devResetUrl ? (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-800 dark:bg-rose-950/30">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Development mode - no email provider is configured yet
            </p>
            <a
              href={result.devResetUrl}
              className="break-all text-rose-600 underline underline-offset-4 dark:text-rose-400"
            >
              {result.devResetUrl}
            </a>
          </div>
        ) : null}
        <Link
          href={signinHref}
          className="text-sm font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
        autoComplete="email"
        placeholder="jane@example.com"
      />

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-foreground/70">
        Remembered your password?{" "}
        <Link
          href={signinHref}
          className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
