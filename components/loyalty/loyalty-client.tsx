"use client";

import Image from "next/image";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  MinusCircle,
  PlusCircle,
  ScanLine,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  adjustLoyaltyPoints,
  redeemLoyaltyReward,
  type LoyaltyFormState,
} from "@/app/(app)/loyalty/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScanAwardPanel } from "@/components/loyalty/scan-award-panel";
import { ProgramSettingsPanel } from "@/components/loyalty/program-settings-panel";

export type LoyaltyCustomerRow = {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  loyaltyPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  pendingStampAmount: number;
  orderCount: number;
  lastOrderAt: string | null;
  createdAt: string;
};

export type LoyaltyTransactionRow = {
  id: string;
  customerName: string;
  email: string;
  orderNumber: string | null;
  type: string;
  points: number;
  balanceAfter: number;
  rewardName: string | null;
  remarks: string | null;
  createdByName: string | null;
  createdAt: string;
};

type RewardTier = { stamps: number; name: string };
type LoyaltyTab = "scan" | "customers" | "settings";

const initialState: LoyaltyFormState = {};
const CUSTOMERS_PER_PAGE = 10;

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

function normalizeCustomerPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

function matchesCustomer(customer: LoyaltyCustomerRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const phoneQuery = normalizeCustomerPhoneNumber(normalizedQuery);
  return (
    customer.displayName.toLowerCase().includes(normalizedQuery) ||
    customer.email.toLowerCase().includes(normalizedQuery) ||
    Boolean(phoneQuery && customer.phoneNumber?.includes(phoneQuery))
  );
}

function updateLoyaltyUrl(tab: LoyaltyTab, query: string) {
  const params = new URLSearchParams();
  if (tab !== "scan") params.set("tab", tab);
  if (query.trim()) params.set("q", query.trim());
  const nextUrl = params.toString() ? `/loyalty?${params.toString()}` : "/loyalty";
  window.history.replaceState(null, "", nextUrl);
}

function LoyaltyActions({
  customer,
  rewardTiers,
}: {
  customer: LoyaltyCustomerRow;
  rewardTiers: RewardTier[];
}) {
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
          {rewardTiers.map((reward) => (
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
          <Label htmlFor="amount">Manual amount adjustment</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            placeholder="e.g. 200 or -50"
            required
          />
          <p className="text-xs text-muted-foreground">
            Amount is converted using the current pesos-per-stamp rule.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" name="remarks" rows={3} placeholder="Reason for adjustment" />
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
              Save amount adjustment
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function CustomersPanel({
  customers,
  transactions,
  query,
  onQueryChange,
  rewardTiers,
  spendPerStamp,
  canManage,
}: {
  customers: LoyaltyCustomerRow[];
  transactions: LoyaltyTransactionRow[];
  query: string;
  onQueryChange: (query: string) => void;
  rewardTiers: RewardTier[];
  spendPerStamp: number;
  canManage: boolean;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? "");
  const [searchInput, setSearchInput] = useState(query);
  const [page, setPage] = useState(1);

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => matchesCustomer(customer, query)),
    [customers, query]
  );
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedCustomers = filteredCustomers.slice(
    (currentPage - 1) * CUSTOMERS_PER_PAGE,
    currentPage * CUSTOMERS_PER_PAGE
  );
  const activeCustomerId = filteredCustomers.some(
    (customer) => customer.id === selectedCustomerId
  )
    ? selectedCustomerId
    : filteredCustomers[0]?.id ?? "";
  const selectedCustomer = useMemo(
    () =>
      filteredCustomers.find((customer) => customer.id === activeCustomerId) ??
      filteredCustomers[0] ??
      null,
    [filteredCustomers, activeCustomerId]
  );

  const selectedTransactions = selectedCustomer
    ? transactions.filter((transaction) => transaction.email === selectedCustomer.email)
    : [];
  const pendingAmount = selectedCustomer?.pendingStampAmount ?? 0;
  const amountToNextStamp = Math.max(0, spendPerStamp - pendingAmount);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    onQueryChange(searchInput.trim());
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredCustomers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Stamps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {filteredCustomers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Customer Loyalty</CardTitle>
              <p className="text-sm text-muted-foreground">Search by email or customer name.</p>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
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
          <div className="grid gap-3">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stamps</TableHead>
                    <TableHead className="hidden md:table-cell">Visits</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No loyalty customers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        data-state={selectedCustomer?.id === customer.id ? "selected" : undefined}
                        onClick={() => setSelectedCustomerId(customer.id)}
                      >
                        <TableCell className="font-medium">{customer.displayName}</TableCell>
                        <TableCell className="text-muted-foreground">{customer.email}</TableCell>
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages} · {filteredCustomers.length} customer
                {filteredCustomers.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            {selectedCustomer ? (
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <h2 className="text-lg font-semibold">{selectedCustomer.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Current stamps</span>
                    <span className="text-2xl font-bold">{selectedCustomer.loyaltyPoints}</span>
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
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="text-muted-foreground">Unstamped amount</p>
                    <p className="font-semibold">{formatCurrency(pendingAmount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pendingAmount > 0
                        ? `${formatCurrency(amountToNextStamp)} more to earn the next stamp.`
                        : "No carried amount toward the next stamp."}
                    </p>
                  </div>
                </div>
                {canManage ? (
                  <LoyaltyActions customer={selectedCustomer} rewardTiers={rewardTiers} />
                ) : (
                  <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Manager access is view-only for customer loyalty details.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a customer to view rewards.</p>
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
                {(selectedTransactions.length > 0 ? selectedTransactions : transactions).map(
                  (transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="grid gap-0.5">
                          <span className="font-medium">{transaction.customerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {transaction.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{transactionTypeLabel(transaction.type)}</TableCell>
                      <TableCell
                        className={
                          transaction.points < 0
                            ? "text-destructive"
                            : transaction.points > 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }
                      >
                        {transaction.points > 0 ? (
                          <PlusCircle className="mr-1 inline size-3.5" />
                        ) : transaction.points < 0 ? (
                          <MinusCircle className="mr-1 inline size-3.5" />
                        ) : null}
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
                  )
                )}
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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

export function LoyaltyClient({
  customers,
  transactions,
  query,
  rewardTiers,
  spendPerStamp,
  canManage,
  canAward,
  canViewCustomers,
  defaultTab,
}: {
  customers: LoyaltyCustomerRow[];
  transactions: LoyaltyTransactionRow[];
  query: string;
  rewardTiers: RewardTier[];
  spendPerStamp: number;
  canManage: boolean;
  canAward: boolean;
  canViewCustomers: boolean;
  defaultTab: LoyaltyTab;
}) {
  const fallbackTab = canAward ? "scan" : "customers";
  const [activeTab, setActiveTab] = useState<LoyaltyTab>(defaultTab || fallbackTab);
  const [customerQuery, setCustomerQuery] = useState(query);

  useEffect(() => {
    updateLoyaltyUrl(activeTab, activeTab === "customers" ? customerQuery : "");
  }, [activeTab, customerQuery]);

  if (!canViewCustomers && !canManage) {
    return <ScanAwardPanel />;
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LoyaltyTab)}>
      <TabsList>
        {canAward ? (
          <TabsTrigger value="scan">
            <ScanLine className="size-4" />
            Scan &amp; Award
          </TabsTrigger>
        ) : null}
        {canViewCustomers ? (
          <TabsTrigger value="customers">
            <Users className="size-4" />
            Customers
          </TabsTrigger>
        ) : null}
        {canManage ? (
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            Program Settings
          </TabsTrigger>
        ) : null}
      </TabsList>
      {canAward ? (
        <TabsContent value="scan" className="mt-4">
          <ScanAwardPanel />
        </TabsContent>
      ) : null}
      {canViewCustomers ? (
        <TabsContent value="customers" className="mt-4">
          <CustomersPanel
            customers={customers}
            transactions={transactions}
            query={customerQuery}
            onQueryChange={setCustomerQuery}
            rewardTiers={rewardTiers}
            spendPerStamp={spendPerStamp}
            canManage={canManage}
          />
        </TabsContent>
      ) : null}
      {canManage ? (
        <TabsContent value="settings" className="mt-4">
          <ProgramSettingsPanel spendPerStamp={spendPerStamp} rewardTiers={rewardTiers} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
