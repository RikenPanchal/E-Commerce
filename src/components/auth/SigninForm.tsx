"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/auth/FormField";
import { getSafeRedirect } from "@/lib/utils/safeRedirect";
import type { AuthResponse, SigninInput } from "@/types/auth";

const initialFormState: SigninInput = { email: "", password: "" };

export function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = getSafeRedirect(searchParams.get("from"));
  const signupHref = from ? `/signup?from=${encodeURIComponent(from)}` : "/signup";
  const forgotPasswordHref = from
    ? `/forgot-password?from=${encodeURIComponent(from)}`
    : "/forgot-password";
  const [form, setForm] = useState<SigninInput>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SigninInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof SigninInput>(key: K, value: SigninInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as AuthResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      const destination = from ?? (data.user.role === "admin" ? "/admin" : "/");
      router.push(destination);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="email"
        label="Email"
        type="email"
        value={form.email}
        onChange={(value) => updateField("email", value)}
        error={fieldErrors.email}
        autoComplete="email"
        placeholder="jane@example.com"
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        value={form.password}
        onChange={(value) => updateField("password", value)}
        error={fieldErrors.password}
        autoComplete="current-password"
        placeholder="Your password"
      />
      <Link
        href={forgotPasswordHref}
        className="-mt-2 self-end text-xs font-medium text-foreground/60 underline underline-offset-4 hover:text-foreground"
      >
        Forgot password?
      </Link>

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-foreground/70">
        Don&apos;t have an account?{" "}
        <Link href={signupHref} className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
          Create one
        </Link>
      </p>
    </form>
  );
}
