import type { OrderStatus } from "@/types/order";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Order placed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
        This order was cancelled.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <div className="flex items-start">
      {STEPS.map((step, index) => {
        const isComplete = index <= currentIndex;
        return (
          <div key={step.key} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete
                    ? "bg-rose-600 text-background"
                    : "bg-black/10 text-foreground/40 dark:bg-white/10"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <span
                className={`text-center text-[10px] sm:text-xs ${isComplete ? "text-foreground" : "text-foreground/40"}`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={`mx-1 h-0.5 min-w-2 flex-1 sm:mx-2 ${
                  index < currentIndex ? "bg-rose-600" : "bg-black/10 dark:bg-white/10"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
