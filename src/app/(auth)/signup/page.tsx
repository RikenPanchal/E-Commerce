import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-foreground">Create your account</h1>
        <p className="text-sm text-foreground/70">
          Join us for early access to new arrivals and member-only offers
        </p>
      </div>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
