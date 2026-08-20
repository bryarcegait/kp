"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Clock, ReceiptText, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  sendSilogOrderToLoyverse,
  type SendOrderState,
} from "@/app/(app)/orders/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PendingOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  phoneNumber: string;
  orderType: string;
  paymentMethod: string;
  status: string;
  customerNote: string | null;
  scheduledFor: string;
  totalAmount: number;
  loyverseReceiptNumber: string | null;
  loyverseSyncedAt: string | null;
  loyverseSyncError: string | null;
  loyverseSentByName: string | null;
  isSilogOnly: boolean;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    category: string;
  }[];
};

const initialState: SendOrderState = {};

function useSendToast(state: SendOrderState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

function statusLabel(status: string) {
  if (status === "sent_to_loyverse") return "Sent to Loyverse";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

function paymentLabel(paymentMethod: string) {
  if (paymentMethod === "gcash") return "GCASH";
  if (paymentMethod === "bank-transfer") return "Bank Transfer";
  return "Cash";
}

function SendOrderForm({ order }: { order: PendingOrderRow }) {
  const [state, formAction, isPending] = useActionState(
    sendSilogOrderToLoyverse,
    initialState
  );
  useSendToast(state, isPending);
  const isSent = Boolean(order.loyverseReceiptNumber);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="orderId" value={order.id} />
      <Button type="submit" disabled={isPending || isSent} className="w-full">
        {isPending ? (
          "Sending..."
        ) : isSent ? (
          <>
            <CheckCircle2 className="size-4" />
            Sent
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send to Loyverse
          </>
        )}
      </Button>
      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function OrderCard({ order }: { order: PendingOrderRow }) {
  const isSent = Boolean(order.loyverseReceiptNumber);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <ReceiptText className="size-5 text-primary" />
              {order.orderNumber}
              <Badge variant={isSent ? "default" : "secondary"}>
                {statusLabel(order.status)}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.customerName} • {order.phoneNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(order.scheduledFor)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {order.customerNote ? (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {order.customerNote}
            </p>
          ) : null}
          {order.loyverseSyncError && !isSent ? (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{order.loyverseSyncError}</p>
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="grid gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Order type
            </span>
            <span>{order.orderType}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Payment
            </span>
            <span>{paymentLabel(order.paymentMethod)}</span>
          </div>
          {order.loyverseReceiptNumber ? (
            <div className="grid gap-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Loyverse receipt
              </span>
              <span className="font-medium">{order.loyverseReceiptNumber}</span>
              {order.loyverseSyncedAt ? (
                <span className="text-xs text-muted-foreground">
                  {formatDate(order.loyverseSyncedAt)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border bg-background p-2 text-muted-foreground">
              <Clock className="size-4" />
              Ready to send
            </div>
          )}
          <SendOrderForm order={order} />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersClient({ orders }: { orders: PendingOrderRow[] }) {
  const pendingOrders = orders.filter((order) => !order.loyverseReceiptNumber);
  const sentOrders = orders.filter((order) => order.loyverseReceiptNumber);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Silog</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sent to Loyverse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sentOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pilot Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Silog</p>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pending</h2>
          <p className="text-sm text-muted-foreground">
            Only orders where every item is in the Silog category appear here.
          </p>
        </div>
        {pendingOrders.length > 0 ? (
          pendingOrders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending Silog orders.
            </CardContent>
          </Card>
        )}
      </section>

      {sentOrders.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Recently Sent</h2>
          {sentOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
