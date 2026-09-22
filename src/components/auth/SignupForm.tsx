"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/auth/FormField";
import { getSafeRedirect } from "@/lib/utils/safeRedirect";
import type { AuthResponse, SignupInput } from "@/types/auth";

const initialFormState: SignupInput = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = getSafeRedirect(searchParams.get("from"));
  const signinHref = from ? `/signin?from=${encodeURIComponent(from)}` : "/signin";
  const [form, setForm] = useState<SignupInput>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof SignupInput>(key: K, value: SignupInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
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

      router.push(from ?? "/");
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
        id="name"
        label="Full name"
        type="text"
        value={form.name}
        onChange={(value) => updateField("name", value)}
        error={fieldErrors.name}
        autoComplete="name"
        placeholder="Jane Doe"
      />
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
        autoComplete="new-password"
        placeholder="At least 6 characters"
      />
      <FormField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        value={form.confirmPassword}
        onChange={(value) => updateField("confirmPassword", value)}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
        placeholder="Re-enter your password"
      />

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href={signinHref} className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}
