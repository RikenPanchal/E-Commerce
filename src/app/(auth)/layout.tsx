import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      <AuthBrandPanel />
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
