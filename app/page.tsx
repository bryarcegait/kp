"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  LocateFixed,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCustomerOrder,
  type CustomerOrderPayload,
} from "@/app/order-actions";
import {
  CUSTOMER_MENU_CATEGORIES,
  FRIES_FLAVOR_OPTIONS,
  WING_FLAVOR_OPTIONS,
  WING_ORDER_CHOICES,
  type CustomerMenuProduct,
  type FriesFlavor,
  type WingFlavor,
  type WingOrderChoice,
  type WingSide,
} from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderStep = "menu" | "details" | "sent";
type OrderType = "deliver" | "pickup" | "dine-in";
type ScheduleType = "now" | "later";

type DeliveryLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

type WingCartItem = CustomerMenuProduct & {
  cartItemId: string;
  quantity: number;
  displayName: string;
  customization: {
    wingFlavor: WingFlavor;
    side: WingSide;
    friesFlavor?: FriesFlavor;
  };
};

type SelectedItem = (CustomerMenuProduct & { quantity: number; displayName: string }) | WingCartItem;

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
  const [menuItems, setMenuItems] = useState<CustomerMenuProduct[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [wingCartItems, setWingCartItems] = useState<WingCartItem[]>([]);
  const [customizingWing, setCustomizingWing] = useState<WingOrderChoice | null>(
    null
  );
  const [selectedWingFlavor, setSelectedWingFlavor] =
    useState<WingFlavor>("Buffalo");
  const [selectedWingSide, setSelectedWingSide] = useState<WingSide>("No side");
  const [selectedFriesFlavor, setSelectedFriesFlavor] =
    useState<FriesFlavor>("Plain");
  const [selectedCategory, setSelectedCategory] = useState("Wings");
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    let isMounted = true;

    async function loadMenu() {
      try {
        const response = await fetch("/api/customer-menu", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load menu");
        const data = (await response.json()) as {
          products?: CustomerMenuProduct[];
        };
        const products = data.products ?? [];

        if (!isMounted) return;
        setMenuItems(products);
        setSelectedCategory(
          products[0]?.category ?? CUSTOMER_MENU_CATEGORIES[0] ?? "Wings"
        );
      } catch {
        if (isMounted) {
          toast.error("Unable to load menu.");
        }
      } finally {
        if (isMounted) setIsLoadingMenu(false);
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const liveCategories = Array.from(new Set(menuItems.map((item) => item.category)));
    return liveCategories.length > 0 ? liveCategories : [...CUSTOMER_MENU_CATEGORIES];
  }, [menuItems]);

  const menuItemsById = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item])),
    [menuItems]
  );

  const selectedItems = useMemo<SelectedItem[]>(
    () => {
      const regularSelectedItems = menuItems.map((item) => ({
        ...item,
        quantity: quantities[item.id] ?? 0,
        displayName: item.name,
      })).filter((item) => item.quantity > 0);

      return [...regularSelectedItems, ...wingCartItems];
    },
    [menuItems, quantities, wingCartItems]
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory = item.category === selectedCategory;
      const isRawWingVariant = item.category === "Wings";
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);

      return matchesCategory && !isRawWingVariant && matchesSearch;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const visibleWingChoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (selectedCategory !== "Wings") return [];

    return WING_ORDER_CHOICES.filter((choice) => {
      const noSideProduct = menuItemsById.get(choice.noSideProductId);
      const withSideProduct = menuItemsById.get(choice.withSideProductId);
      const matchesSearch =
        query.length === 0 || choice.label.toLowerCase().includes(query);

      return matchesSearch && (noSideProduct || withSideProduct);
    });
  }, [menuItemsById, searchQuery, selectedCategory]);

  const categoryCounts = useMemo(
    () =>
      categories.reduce(
        (counts, category) => ({
          ...counts,
          [category]:
            category === "Wings"
              ? WING_ORDER_CHOICES.length
              : menuItems.filter((item) => item.category === category).length,
        }),
        {} as Record<string, number>
      ),
    [categories, menuItems]
  );
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const displayedItemCount =
    selectedCategory === "Wings" ? visibleWingChoices.length : filteredItems.length;
  const customizingNoSideProduct = customizingWing
    ? menuItemsById.get(customizingWing.noSideProductId)
    : undefined;
  const customizingWithSideProduct = customizingWing
    ? menuItemsById.get(customizingWing.withSideProductId)
    : undefined;
  const selectedWingProduct = customizingWing
    ? getWingProduct(customizingWing, selectedWingSide)
    : undefined;
  const selectedWingPrice = selectedWingProduct?.price ?? 0;

  function changeQuantity(itemId: string, amount: number) {
    const product = menuItems.find((item) => item.id === itemId);
    if (!product?.isAvailable && amount > 0) return;

    setQuantities((current) => {
      const nextQuantity = Math.max(0, (current[itemId] ?? 0) + amount);
      return {
        ...current,
        [itemId]: nextQuantity,
      };
    });
  }

  function openWingCustomizer(choice: WingOrderChoice) {
    setCustomizingWing(choice);
    setSelectedWingFlavor("Buffalo");
    setSelectedWingSide("No side");
    setSelectedFriesFlavor("Plain");
  }

  function getWingProduct(choice: WingOrderChoice, side: WingSide) {
    return menuItemsById.get(
      side === "No side" ? choice.noSideProductId : choice.withSideProductId
    );
  }

  function getWingChoiceQuantity(choice: WingOrderChoice) {
    return wingCartItems
      .filter(
        (item) =>
          item.id === choice.noSideProductId ||
          item.id === choice.withSideProductId
      )
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  function addCustomizedWing() {
    if (!customizingWing) return;

    const product = getWingProduct(customizingWing, selectedWingSide);
    if (!product?.isAvailable) {
      toast.error("This wings option is not available.");
      return;
    }

    const friesFlavor =
      selectedWingSide === "Fries" ? selectedFriesFlavor : undefined;
    const cartItemId = [
      product.id,
      selectedWingFlavor,
      selectedWingSide,
      friesFlavor ?? "",
    ].join("|");
    const sideLabel =
      selectedWingSide === "No side"
        ? "No side"
        : selectedWingSide === "Fries"
          ? `${friesFlavor} Fries`
          : selectedWingSide;
    const displayName = `${customizingWing.label} (${selectedWingFlavor}, ${sideLabel})`;

    setWingCartItems((current) => {
      const existing = current.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return current.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          cartItemId,
          quantity: 1,
          displayName,
          customization: {
            wingFlavor: selectedWingFlavor,
            side: selectedWingSide,
            friesFlavor,
          },
        },
      ];
    });
    setCustomizingWing(null);
    toast.success("Wings added");
  }

  function changeCartItemQuantity(item: SelectedItem, amount: number) {
    if ("cartItemId" in item) {
      setWingCartItems((current) =>
        current
          .map((cartItem) =>
            cartItem.cartItemId === item.cartItemId
              ? { ...cartItem, quantity: Math.max(0, cartItem.quantity + amount) }
              : cartItem
          )
          .filter((cartItem) => cartItem.quantity > 0)
      );
      return;
    }

    changeQuantity(item.id, amount);
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
        ...("customization" in item ? { customization: item.customization } : {}),
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

          <div className="grid gap-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search in menu"
                  className="h-11 rounded-full bg-muted/50 pl-9"
                />
              </div>
              <Badge variant="secondary" className="w-fit">
                {selectedItems.length} selected
              </Badge>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <div className="flex min-w-max gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === category
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {category} ({categoryCounts[category]})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary">
                  Kanto&apos;t Pakpakan Menu
                </p>
                <h2 className="text-3xl font-bold tracking-tight">
                  {selectedCategory}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {displayedItemCount} item{displayedItemCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {isLoadingMenu ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="min-h-44 rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="mt-6 h-16 animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : null}

              {!isLoadingMenu &&
              (selectedCategory === "Wings"
                ? visibleWingChoices.length === 0
                : filteredItems.length === 0) ? (
                <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground sm:col-span-2">
                  No menu items found.
                </div>
              ) : null}

              {!isLoadingMenu && selectedCategory === "Wings"
                ? visibleWingChoices.map((choice) => {
                    const noSideProduct = menuItemsById.get(choice.noSideProductId);
                    const withSideProduct = menuItemsById.get(choice.withSideProductId);
                    const isAvailable =
                      Boolean(noSideProduct?.isAvailable) ||
                      Boolean(withSideProduct?.isAvailable);
                    const quantity = getWingChoiceQuantity(choice);

                    return (
                      <div
                        key={choice.key}
                        className={`grid min-h-44 grid-cols-[1fr_128px] gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition ${
                          isAvailable
                            ? "hover:border-primary/40 hover:shadow-md"
                            : "opacity-55 grayscale"
                        }`}
                      >
                        <div className="grid content-between gap-4">
                          <div className="grid gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-bold leading-tight">
                                  {choice.label}
                                </p>
                                {!isAvailable ? (
                                  <Badge variant="secondary">Not available</Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 font-semibold">
                                {formatCurrency(choice.noSidePrice)}
                                <span className="text-sm font-normal text-muted-foreground">
                                  {" "}
                                  no side / {formatCurrency(choice.withSidePrice)} with side
                                </span>
                              </p>
                            </div>
                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                              Choose side, fries flavor, and wings flavor.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="min-w-8 text-center text-lg font-bold">
                              {quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openWingCustomizer(choice)}
                              disabled={!isAvailable}
                            >
                              Customize
                            </Button>
                          </div>
                        </div>
                        <div className="relative self-center">
                          <div className="aspect-square rounded-full bg-primary/10" />
                          <Image
                            src="/menu/wings.svg"
                            alt={choice.label}
                            width={132}
                            height={96}
                            className="absolute inset-0 m-auto h-28 w-32 object-contain drop-shadow-sm"
                          />
                        </div>
                      </div>
                    );
                  })
                : null}

              {!isLoadingMenu ? filteredItems.map((item) => {
                const quantity = quantities[item.id] ?? 0;

                return (
                  <div
                    key={item.id}
                    className={`grid min-h-44 grid-cols-[1fr_128px] gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition ${
                      item.isAvailable
                        ? "hover:border-primary/40 hover:shadow-md"
                        : "opacity-55 grayscale"
                    }`}
                  >
                    <div className="grid content-between gap-4">
                      <div className="grid gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-bold leading-tight">
                              {item.name}
                            </p>
                            {!item.isAvailable ? (
                              <Badge variant="secondary">Not available</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 font-semibold">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={quantity === 0}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="min-w-8 text-center text-lg font-bold">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => changeQuantity(item.id, 1)}
                          disabled={!item.isAvailable}
                          aria-label={`Add ${item.name}`}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative self-center">
                      <div className="aspect-square rounded-full bg-primary/10" />
                      <Image
                        src={item.imageSrc}
                        alt={item.name}
                        width={132}
                        height={96}
                        className="absolute inset-0 m-auto h-28 w-32 object-contain drop-shadow-sm"
                      />
                    </div>
                  </div>
                );
              }) : null}
            </div>
          </div>
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
                      setWingCartItems([]);
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
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Image
                              src={item.imageSrc}
                              alt={item.displayName}
                              width={44}
                              height={44}
                              className="size-11 shrink-0 rounded-lg border bg-muted object-contain p-1"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.price)} each
                              </p>
                            </div>
                          </div>
                          <div className="grid justify-items-end gap-1">
                            <span className="font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => changeCartItemQuantity(item, -1)}
                                aria-label={`Remove ${item.displayName}`}
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="min-w-5 text-center text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => changeCartItemQuantity(item, 1)}
                                aria-label={`Add ${item.displayName}`}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                          </div>
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
                      onClick={() => setStep("details")}
                    >
                      Ready to send order
                    </Button>
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
                          onClick={() => setStep("menu")}
                        >
                          Back to order
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

      <Dialog
        open={customizingWing !== null}
        onOpenChange={(open) => !open && setCustomizingWing(null)}
      >
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{customizingWing?.label ?? "Customize Wings"}</DialogTitle>
          </DialogHeader>

          {customizingWing ? (
            <div className="grid gap-5">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(selectedWingPrice)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(customizingWing.noSidePrice)} no side /{" "}
                  {formatCurrency(customizingWing.withSidePrice)} with side
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Side</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["No side", "Java Rice", "Plain Rice", "Fries"] as WingSide[]).map(
                    (side) => {
                      const product =
                        side === "No side"
                          ? customizingNoSideProduct
                          : customizingWithSideProduct;
                      const isDisabled = !product?.isAvailable;

                      return (
                        <Button
                          key={side}
                          type="button"
                          variant={selectedWingSide === side ? "default" : "outline"}
                          disabled={isDisabled}
                          onClick={() => setSelectedWingSide(side)}
                          className="justify-start"
                        >
                          {side}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>

              {selectedWingSide === "Fries" ? (
                <div className="grid gap-2">
                  <Label>Fries flavor</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRIES_FLAVOR_OPTIONS.map((flavor) => (
                      <Button
                        key={flavor}
                        type="button"
                        variant={
                          selectedFriesFlavor === flavor ? "default" : "outline"
                        }
                        onClick={() => setSelectedFriesFlavor(flavor)}
                        className="justify-start"
                      >
                        {flavor}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Wings flavor</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {WING_FLAVOR_OPTIONS.map((flavor) => (
                    <Button
                      key={flavor}
                      type="button"
                      variant={selectedWingFlavor === flavor ? "default" : "outline"}
                      onClick={() => setSelectedWingFlavor(flavor)}
                      className="justify-start whitespace-normal text-left"
                    >
                      {flavor}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={addCustomizedWing}
                disabled={!selectedWingProduct?.isAvailable}
              >
                Add to order
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
