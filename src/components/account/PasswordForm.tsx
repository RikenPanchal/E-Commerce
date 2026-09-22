"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/auth/FormField";
import type { PasswordChangeResponse } from "@/types/account";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await response.json()) as PasswordChangeResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="currentPassword"
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={setCurrentPassword}
        error={fieldErrors.currentPassword}
        autoComplete="current-password"
      />
      <FormField
        id="newPassword"
        label="New password"
        type="password"
        value={newPassword}
        onChange={setNewPassword}
        error={fieldErrors.newPassword}
        autoComplete="new-password"
      />
      <FormField
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
      />

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
      {success ? <p className="text-sm text-green-600 dark:text-green-400">Password updated</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
