"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { CalendarClock, LocateFixed, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import {
  createCustomerOrder,
  type CustomerOrderPayload,
} from "@/app/order-actions";
import { SILOG_MEALS } from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderStep = "menu" | "review" | "details" | "sent";
type OrderType = "deliver" | "pickup" | "dine-in";
type ScheduleType = "now" | "later";

type DeliveryLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "deliver", label: "Deliver" },
  { value: "pickup", label: "Pick-up" },
  { value: "dine-in", label: "Dine-in" },
];

function todayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentInputTime() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getOrderSchedule(scheduleType: ScheduleType, date: string, time: string) {
  if (scheduleType === "now") return new Date().toISOString();
  return new Date(`${date}T${time || "00:00"}`).toISOString();
}

function getLocationLabel(data: {
  display_name?: string;
  name?: string;
  address?: Record<string, string | undefined>;
}) {
  const address = data.address ?? {};
  const parts = [
    data.name,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.city ?? address.town ?? address.municipality,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : data.display_name;
}

export default function CustomerOrderingPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<OrderStep>("menu");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("now");
  const [orderDate, setOrderDate] = useState(todayInputDate());
  const [orderTime, setOrderTime] = useState(currentInputTime());
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [orderNumber, setOrderNumber] = useState("");

  const selectedItems = useMemo(
    () =>
      SILOG_MEALS.map((item) => ({
        ...item,
        quantity: quantities[item.id] ?? 0,
      })).filter((item) => item.quantity > 0),
    [quantities]
  );
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  function changeQuantity(itemId: string, amount: number) {
    setQuantities((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + amount);
      return {
        ...current,
        [itemId]: nextQuantity,
      };
    });
  }

  async function confirmLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        let label = "Pinned delivery location";

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            label = getLocationLabel(data) ?? label;
          }
        } catch {
          label = "Pinned delivery location";
        }

        setDeliveryLocation({ latitude, longitude, label });
        setIsLocating(false);
        toast.success("Delivery location confirmed");
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function submitOrder() {
    if (selectedItems.length === 0) {
      toast.error("Please choose at least one item.");
      return;
    }

    const payload: CustomerOrderPayload = {
      customerName,
      phoneNumber,
      orderType,
      scheduleType,
      scheduledFor: getOrderSchedule(scheduleType, orderDate, orderTime),
      deliveryAddress: deliveryLocation?.label,
      deliveryLatitude: deliveryLocation?.latitude,
      deliveryLongitude: deliveryLocation?.longitude,
      items: selectedItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    };

    startTransition(async () => {
      const result = await createCustomerOrder(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setOrderNumber(result.orderNumber ?? "");
      setStep("sent");
      toast.success("Order sent");
    });
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
        <section className="grid content-start gap-5">
          <div className="flex items-center gap-3">
            <Image
              src="/kanto-logo.png"
              alt="Kanto't Pakpakan"
              width={56}
              height={56}
              className="size-14 rounded-lg bg-primary object-contain p-1"
            />
            <div>
              <p className="text-sm font-medium text-primary">Kanto&apos;t Pakpakan</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Customer Ordering
              </h1>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Silog Meals</CardTitle>
              <Badge variant="secondary">{selectedItems.length} selected</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {SILOG_MEALS.map((item) => {
                  const quantity = quantities[item.id] ?? 0;

                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.category}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={quantity === 0}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="min-w-10 text-center text-lg font-semibold">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {step === "sent" ? (
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-lg font-semibold">Order sent</p>
                  <p className="text-sm text-muted-foreground">
                    Reference number
                  </p>
                  <p className="text-2xl font-bold text-primary">{orderNumber}</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setQuantities({});
                      setStep("menu");
                      setOrderNumber("");
                    }}
                  >
                    New order
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    {selectedItems.length > 0 ? (
                      selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No items selected.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Total</span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {step === "menu" ? (
                    <Button
                      type="button"
                      disabled={selectedItems.length === 0}
                      onClick={() => setStep("review")}
                    >
                      Review order
                    </Button>
                  ) : null}

                  {step === "review" ? (
                    <div className="grid gap-2">
                      <Button type="button" onClick={() => setStep("details")}>
                        Ready to send order
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("menu")}
                      >
                        Edit items
                      </Button>
                    </div>
                  ) : null}

                  {step === "details" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customerName">Name</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phoneNumber">Phone number</Label>
                        <Input
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          inputMode="tel"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Order type</Label>
                        <Select
                          value={orderType}
                          onValueChange={(value) => setOrderType(value as OrderType)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Time</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={scheduleType === "now" ? "default" : "outline"}
                            onClick={() => setScheduleType("now")}
                          >
                            Now
                          </Button>
                          <Button
                            type="button"
                            variant={scheduleType === "later" ? "default" : "outline"}
                            onClick={() => setScheduleType("later")}
                          >
                            Specific
                          </Button>
                        </div>
                      </div>

                      {scheduleType === "later" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="orderDate">Date</Label>
                            <Input
                              id="orderDate"
                              type="date"
                              min={todayInputDate()}
                              value={orderDate}
                              onChange={(event) => setOrderDate(event.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="orderTime">Time</Label>
                            <Input
                              id="orderTime"
                              type="time"
                              value={orderTime}
                              onChange={(event) => setOrderTime(event.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                          <CalendarClock className="size-4" />
                          Today, now
                        </div>
                      )}

                      {orderType === "deliver" ? (
                        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
                          <Label>Delivery location</Label>
                          {deliveryLocation ? (
                            <p className="text-sm font-medium">
                              {deliveryLocation.label}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No location confirmed.
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={confirmLocation}
                            disabled={isLocating}
                          >
                            <LocateFixed className="size-4" />
                            {isLocating ? "Getting location..." : "Confirm location"}
                          </Button>
                        </div>
                      ) : null}

                      <div className="grid gap-2">
                        <Button
                          type="button"
                          onClick={submitOrder}
                          disabled={isPending}
                        >
                          {isPending ? "Sending..." : "Send order"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep("review")}
                        >
                          Back to review
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
