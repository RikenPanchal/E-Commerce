import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { updateOrderStatus } from "@/lib/admin/orders";
import { toOrderView } from "@/lib/shop/orders";
import { updateOrderStatusSchema } from "@/lib/validations/order";
import { firstFieldErrors } from "@/lib/validations/formatZodError";
import type { OrderResponse } from "@/types/order";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderResponse>> {
  // The proxy (src/proxy.ts) already gatekeeps `/api/admin/*`, but this
  // handler re-checks authorization itself rather than trusting it alone.
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please fix the highlighted fields",
        fieldErrors: firstFieldErrors(parsed.error),
      },
      { status: 400 }
    );
  }

  try {
    const result = await updateOrderStatus(id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, order: toOrderView(result.order) }, { status: 200 });
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
