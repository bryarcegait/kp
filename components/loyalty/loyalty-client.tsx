"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Gift, MinusCircle, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import {
  adjustLoyaltyPoints,
  redeemLoyaltyReward,
  type LoyaltyFormState,
} from "@/app/(app)/loyalty/actions";
import { LOYALTY_REWARDS, LOYALTY_SPEND_PER_STAMP } from "@/lib/loyalty";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LoyaltyCustomerRow = {
  id: string;
  displayName: string;
  phoneNumber: string;
  loyaltyPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  orderCount: number;
  lastOrderAt: string | null;
  createdAt: string;
};

export type LoyaltyTransactionRow = {
  id: string;
  customerName: string;
  phoneNumber: string;
  orderNumber: string | null;
  type: string;
  points: number;
  balanceAfter: number;
  rewardName: string | null;
  remarks: string | null;
  createdByName: string | null;
  createdAt: string;
};

const initialState: LoyaltyFormState = {};

function useFormToast(state: LoyaltyFormState, isPending: boolean) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state.error) toast.error(state.error);
      if (state.success) toast.success(state.success);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, state.success]);
}

function LoyaltyStampRow({ stamps }: { stamps: number }) {
  const visibleStamps = Math.min(stamps, 10);

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }).map((_, index) => {
        const isEarned = index < visibleStamps;
        return (
          <span
            key={index}
            className={`grid size-10 place-items-center rounded-full border ${
              isEarned
                ? "border-primary bg-primary/10"
                : "border-dashed border-muted-foreground/35 bg-muted/30"
            }`}
          >
            {isEarned ? (
              <Image
                src="/kanto-logo.png"
                alt=""
                width={30}
                height={30}
                className="size-8 object-contain"
              />
            ) : null}
          </span>
        );
      })}
      {stamps > 10 ? (
        <span className="grid h-10 place-items-center rounded-full border bg-muted px-3 text-sm font-semibold">
          +{stamps - 10}
        </span>
      ) : null}
    </div>
  );
}

function transactionTypeLabel(type: string) {
  if (type === "earned") return "Earned";
  if (type === "redeemed") return "Redeemed";
  if (type === "adjustment") return "Adjustment";
  return type;
}

function LoyaltyActions({ customer }: { customer: LoyaltyCustomerRow }) {
  const [adjustState, adjustAction, isAdjusting] = useActionState(
    adjustLoyaltyPoints,
    initialState
  );
  const [redeemState, redeemAction, isRedeeming] = useActionState(
    redeemLoyaltyReward,
    initialState
  );
  useFormToast(adjustState, isAdjusting);
  useFormToast(redeemState, isRedeeming);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <p className="text-sm font-medium">Redeem reward</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LOYALTY_REWARDS.map((reward) => (
            <form key={reward.stamps} action={redeemAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="rewardStamps" value={reward.stamps} />
              <Button
                type="submit"
                variant={customer.loyaltyPoints >= reward.stamps ? "default" : "outline"}
                className="w-full justify-start"
                disabled={isRedeeming || customer.loyaltyPoints < reward.stamps}
              >
                <Gift className="size-4" />
                {reward.stamps} stamps
              </Button>
            </form>
          ))}
        </div>
        {redeemState.error ? (
          <p className="text-sm font-medium text-destructive">{redeemState.error}</p>
        ) : null}
      </div>

      <form action={adjustAction} className="grid gap-3">
        <input type="hidden" name="customerId" value={customer.id} />
        <div className="grid gap-2">
          <Label htmlFor="points">Manual adjustment</Label>
          <Input
            id="points"
            name="points"
            type="number"
            step="1"
            placeholder="e.g. 1 or -1"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            name="remarks"
            rows={3}
            placeholder="Reason for adjustment"
          />
        </div>
        {adjustState.error ? (
          <p className="text-sm font-medium text-destructive">{adjustState.error}</p>
        ) : null}
        <Button type="submit" variant="outline" disabled={isAdjusting}>
          {isAdjusting ? (
            "Saving..."
          ) : (
            <>
              <PlusCircle className="size-4" />
              Save adjustment
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export function LoyaltyClient({
  customers,
  transactions,
  query,
}: {
  customers: LoyaltyCustomerRow[];
  transactions: LoyaltyTransactionRow[];
  query: string;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? "");
  const activeCustomerId = customers.some(
    (customer) => customer.id === selectedCustomerId
  )
    ? selectedCustomerId
    : customers[0]?.id ?? "";
  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) => customer.id === activeCustomerId) ??
      customers[0] ??
      null,
    [customers, activeCustomerId]
  );

  const selectedTransactions = selectedCustomer
    ? transactions.filter((transaction) => transaction.phoneNumber === selectedCustomer.phoneNumber)
    : [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Stamps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Earning Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(LOYALTY_SPEND_PER_STAMP)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 stamp per eligible subtotal, delivery fee excluded
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Customer Loyalty</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search by cellphone number or customer name.
              </p>
            </div>
            <form action="/loyalty" className="flex items-center gap-2">
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search loyalty"
                className="h-9 w-48"
              />
              <Button type="submit" variant="outline">
                <Search className="size-4" />
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cellphone</TableHead>
                  <TableHead>Stamps</TableHead>
                  <TableHead className="hidden md:table-cell">Visits</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No loyalty customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      data-state={selectedCustomer?.id === customer.id ? "selected" : undefined}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <TableCell className="font-medium">
                        {customer.displayName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.phoneNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.loyaltyPoints >= 5 ? "default" : "secondary"}>
                          {customer.loyaltyPoints}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.orderCount}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border p-4">
            {selectedCustomer ? (
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <h2 className="text-lg font-semibold">
                    {selectedCustomer.displayName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.phoneNumber}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Current stamps</span>
                    <span className="text-2xl font-bold">
                      {selectedCustomer.loyaltyPoints}
                    </span>
                  </div>
                  <LoyaltyStampRow stamps={selectedCustomer.loyaltyPoints} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-muted-foreground">Lifetime</p>
                      <p className="font-semibold">{selectedCustomer.lifetimePoints}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-muted-foreground">Redeemed</p>
                      <p className="font-semibold">{selectedCustomer.redeemedPoints}</p>
                    </div>
                  </div>
                </div>
                <LoyaltyActions customer={selectedCustomer} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a customer to manage rewards.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loyalty Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stamps</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Remarks</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedTransactions.length > 0
                  ? selectedTransactions
                  : transactions
                ).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <span className="font-medium">{transaction.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.phoneNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{transactionTypeLabel(transaction.type)}</TableCell>
                    <TableCell
                      className={
                        transaction.points < 0
                          ? "text-destructive"
                          : "text-emerald-700 dark:text-emerald-400"
                      }
                    >
                      {transaction.points > 0 ? (
                        <PlusCircle className="mr-1 inline size-3.5" />
                      ) : (
                        <MinusCircle className="mr-1 inline size-3.5" />
                      )}
                      {transaction.points}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {transaction.orderNumber ?? "-"}
                    </TableCell>
                    <TableCell className="hidden max-w-72 truncate text-muted-foreground lg:table-cell">
                      {transaction.rewardName ?? transaction.remarks ?? "-"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No loyalty activity yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
