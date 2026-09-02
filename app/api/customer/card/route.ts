import { NextResponse } from "next/server";
import { getCurrentCustomerCard } from "@/app/customer-loyalty-actions";

export async function GET() {
  const card = await getCurrentCustomerCard();
  if (!card) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  return NextResponse.json({ card });
}
