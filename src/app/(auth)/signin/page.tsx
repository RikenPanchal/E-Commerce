import type { Metadata } from "next";
import { Suspense } from "react";
import { SigninForm } from "@/components/auth/SigninForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SigninPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-foreground/70">Sign in to continue shopping</p>
      </div>
      <Suspense fallback={null}>
        <SigninForm />
      </Suspense>
    </div>
  );
}
