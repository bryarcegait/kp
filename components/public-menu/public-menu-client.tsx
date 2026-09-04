"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Flame,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getWingExtraFlavorCharge,
  isBestSellerWingFlavor,
  isSpicyWingFlavor,
  WING_ORDER_CHOICES,
  WING_FLAVOR_OPTIONS,
  WING_SIDE_OPTIONS,
  FRIES_FLAVOR_OPTIONS,
  type CustomerMenuProduct,
  type WingOrderChoice,
  type WingFlavor,
  type WingSide,
  type FriesFlavor,
} from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ORDER_LIST_STORAGE_KEY = "kp_order_list_v2";

type OrderLine = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type WingChoiceItem = {
  kind: "wingChoice";
  choice: WingOrderChoice;
  noSideProduct: CustomerMenuProduct;
  withSideProduct?: CustomerMenuProduct;
};

type DisplayItem = { kind: "product"; product: CustomerMenuProduct } | WingChoiceItem;

function displayName(item: DisplayItem) {
  return item.kind === "wingChoice" ? (item.choice.label ?? item.noSideProduct.name) : item.product.name;
}

function displayCategory(item: DisplayItem) {
  return item.kind === "wingChoice" ? item.noSideProduct.category : item.product.category;
}

function displayIsAvailable(item: DisplayItem) {
  return item.kind === "wingChoice"
    ? Boolean(item.noSideProduct.isAvailable) || Boolean(item.withSideProduct?.isAvailable)
    : item.product.isAvailable;
}

function displaySearchText(item: DisplayItem) {
  if (item.kind === "wingChoice") return `${displayName(item)} ${displayCategory(item)}`.toLowerCase();
  return `${item.product.name} ${item.product.category} ${item.product.description}`.toLowerCase();
}

function displayImageSrc(item: DisplayItem) {
  return item.kind === "wingChoice" ? item.noSideProduct.imageSrc : item.product.imageSrc;
}

function displayTags(item: DisplayItem) {
  const product = item.kind === "wingChoice" ? item.noSideProduct : item.product;
  return { isBestSeller: product.isBestSeller, isSpicy: product.isSpicy };
}

function readStoredOrderList(): Record<string, OrderLine> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ORDER_LIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getDefaultSide(item: WingChoiceItem): WingSide {
  if (!item.choice.supportsSides || !item.withSideProduct) return "No side";
  return item.withSideProduct.isAvailable ? "Java Rice" : "No side";
}

export function PublicMenuClient({
  products,
}: {
  products: CustomerMenuProduct[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderLines, setOrderLines] = useState<Record<string, OrderLine>>({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [customizingChoice, setCustomizingChoice] = useState<WingChoiceItem | null>(null);
  const [selectedSide, setSelectedSide] = useState<WingSide>("No side");
  const [selectedFriesFlavor, setSelectedFriesFlavor] = useState<FriesFlavor>("Plain");
  const [selectedFlavors, setSelectedFlavors] = useState<WingFlavor[]>([]);

  useEffect(() => {
    // Deferred rather than called directly so the first paint still matches
    // the server-rendered (empty) state before localStorage is applied.
    const timeout = setTimeout(() => {
      setOrderLines(readStoredOrderList());
      setHasHydrated(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(ORDER_LIST_STORAGE_KEY, JSON.stringify(orderLines));
    } catch {
      // Best-effort only — an order list that doesn't persist isn't worth failing over.
    }
  }, [orderLines, hasHydrated]);

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  // Merges the separate "solo" / "with rice or fries" catalog rows for wing
  // meals, barkada boxes, bilao trays, and wings+pasta combos into a single
  // card with a "Customize" flow (side + flavor picker) — those items need
  // more than a plain quantity stepper. Everything else renders unchanged.
  const displayItems = useMemo(() => {
    const consumedIds = new Set<string>();
    const choiceByNoSideId = new Map(WING_ORDER_CHOICES.map((choice) => [choice.noSideProductId, choice]));
    const items: DisplayItem[] = [];

    for (const product of products) {
      if (consumedIds.has(product.id)) continue;
      const choice = choiceByNoSideId.get(product.id);

      if (choice) {
        const withSideProduct = choice.withSideProductId
          ? productsById.get(choice.withSideProductId)
          : undefined;
        consumedIds.add(product.id);
        if (withSideProduct) consumedIds.add(withSideProduct.id);
        items.push({ kind: "wingChoice", choice, noSideProduct: product, withSideProduct });
      } else {
        items.push({ kind: "product", product });
      }
    }

    return items;
  }, [products, productsById]);

  const categories = useMemo(
    () => Array.from(new Set(displayItems.map((item) => displayCategory(item)))),
    [displayItems]
  );

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return displayItems.filter((item) => {
      const matchesCategory = selectedCategory === "All" || displayCategory(item) === selectedCategory;
      const matchesSearch = query.length === 0 || displaySearchText(item).includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [displayItems, searchQuery, selectedCategory]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, DisplayItem[]>();
    for (const item of visibleItems) {
      const category = displayCategory(item);
      groups.set(category, [...(groups.get(category) ?? []), item]);
    }
    return Array.from(groups.entries());
  }, [visibleItems]);

  const orderLinesList = Object.values(orderLines);
  const orderCount = orderLinesList.reduce((sum, line) => sum + line.quantity, 0);
  const orderTotal = orderLinesList.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  function adjustQuantity(key: string, delta: number) {
    setOrderLines((previous) => {
      const existing = previous[key];
      if (!existing) return previous;
      const nextQuantity = existing.quantity + delta;
      const next = { ...previous };
      if (nextQuantity <= 0) {
        delete next[key];
      } else {
        next[key] = { ...existing, quantity: nextQuantity };
      }
      return next;
    });
  }

  function removeLine(key: string) {
    setOrderLines((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function addSimpleProduct(product: CustomerMenuProduct) {
    setOrderLines((previous) => {
      const existing = previous[product.id];
      return {
        ...previous,
        [product.id]: {
          key: product.id,
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });
    toast.success(`Added ${product.name} to your order list`);
  }

  function clearOrder() {
    setOrderLines({});
    setIsOrderSheetOpen(false);
  }

  function orderedQuantityForChoice(choiceKey: string) {
    return orderLinesList
      .filter((line) => line.key.startsWith(`${choiceKey}|`))
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  function openWingCustomizer(item: WingChoiceItem) {
    setCustomizingChoice(item);
    setSelectedFlavors([]);
    setSelectedSide(getDefaultSide(item));
    setSelectedFriesFlavor("Plain");
  }

  function toggleFlavor(flavor: WingFlavor) {
    setSelectedFlavors((current) =>
      current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor]
    );
  }

  const dialogNormalizedSide: WingSide =
    customizingChoice && customizingChoice.choice.supportsSides ? selectedSide : "No side";
  const dialogResolvedProduct = customizingChoice
    ? dialogNormalizedSide === "No side"
      ? customizingChoice.noSideProduct
      : (customizingChoice.withSideProduct ?? customizingChoice.noSideProduct)
    : null;
  const dialogExtraCharge = customizingChoice
    ? getWingExtraFlavorCharge(customizingChoice.choice, selectedFlavors)
    : 0;
  const dialogPrice = (dialogResolvedProduct?.price ?? 0) + dialogExtraCharge;

  function addCustomizedWing() {
    if (!customizingChoice || !dialogResolvedProduct) return;

    if (!dialogResolvedProduct.isAvailable) {
      toast.error("This option is not available.");
      return;
    }
    if (selectedFlavors.length === 0) {
      toast.error("Please choose at least one flavor.");
      return;
    }

    const { choice } = customizingChoice;
    const friesFlavor = dialogNormalizedSide === "Fries" ? selectedFriesFlavor : undefined;
    const unitPrice = dialogResolvedProduct.price + dialogExtraCharge;
    const flavorKey = [...selectedFlavors].sort().join("+");
    const lineKey = [choice.key, flavorKey, dialogNormalizedSide, friesFlavor ?? ""].join("|");

    const sideLabel =
      dialogNormalizedSide === "No side"
        ? null
        : dialogNormalizedSide === "Fries"
          ? `${friesFlavor} Fries`
          : dialogNormalizedSide;
    const extraLabel =
      dialogExtraCharge > 0 ? `, +${formatCurrency(dialogExtraCharge)} extra flavors` : "";
    const customizationLabel = [selectedFlavors.join(" / "), choice.supportsSides ? sideLabel : null]
      .filter(Boolean)
      .join(", ");
    const name = `${displayName(customizingChoice)} (${customizationLabel}${extraLabel})`;

    setOrderLines((previous) => {
      const existing = previous[lineKey];
      return {
        ...previous,
        [lineKey]: {
          key: lineKey,
          productId: dialogResolvedProduct.id,
          name,
          unitPrice,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });

    toast.success("Added to your order list");
    setCustomizingChoice(null);
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-24 text-[#281713]">
      <header className="border-b border-[#e7c7a8] bg-[#fff8ef]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/kanto-logo.png"
              alt="Kanto't Pakpakan"
              width={48}
              height={48}
              className="size-11 rounded-full bg-white object-contain p-1 shadow-sm"
              priority
            />
            <div>
              <h1 className="text-lg font-black uppercase tracking-wide sm:text-xl">
                Kanto&apos;t Pakpakan
              </h1>
              <p className="text-xs font-medium text-[#8b3f1d] sm:text-sm">Restaurant Menu</p>
            </div>
          </div>

          <Button asChild size="sm" className="h-9 bg-[#c45a23] px-3 text-white hover:bg-[#a94618]">
            <Link href="/">
              <WalletCards className="size-4" />
              eLoyalty Card
            </Link>
          </Button>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-[#e7c7a8] bg-[#fff8ef]/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-2.5 px-4 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b3f1d]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for wings, silog, coffee..."
              className="h-11 border-[#d8a77a] bg-white pl-9"
            />
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {["All", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? "bg-[#c45a23] text-white shadow-sm"
                    : "border border-[#d8a77a] bg-white text-[#5b2a18] hover:bg-[#fff0dd]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6">
        {groupedItems.map(([category, items]) => (
          <div key={category} className="grid gap-4">
            {selectedCategory === "All" ? (
              <div className="flex items-end justify-between gap-3 border-b-2 border-[#c45a23] pb-2">
                <h2 className="font-serif text-2xl font-black text-[#7a2f14] sm:text-3xl">
                  {category}
                </h2>
                <span className="text-sm font-semibold text-[#8b3f1d]">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {items.map((item) => {
                const isAvailable = displayIsAvailable(item);
                const { isBestSeller, isSpicy } = displayTags(item);
                const name = displayName(item);

                return (
                  <article
                    key={item.kind === "wingChoice" ? item.choice.key : item.product.id}
                    className={`grid overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                      isAvailable ? "border-[#e7c7a8]" : "border-[#d1c8be] bg-[#f1eee9]"
                    }`}
                  >
                    <div className="relative aspect-square bg-[#fff1d9]">
                      <Image
                        src={displayImageSrc(item)}
                        alt={name}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                        className={`object-contain p-3 ${isAvailable ? "" : "grayscale opacity-45"}`}
                      />
                      {isAvailable && (isBestSeller || isSpicy) ? (
                        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
                          {isBestSeller ? (
                            <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                              <Star className="size-3 fill-current" /> Best Seller
                            </Badge>
                          ) : null}
                          {isSpicy ? (
                            <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
                              <Flame className="size-3 fill-current" /> Spicy
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                      {!isAvailable ? (
                        <div className="absolute inset-0 grid place-items-center bg-white/50">
                          <Badge variant="secondary" className="text-xs">
                            Unavailable
                          </Badge>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-1.5 p-3">
                      <h3
                        className={`text-sm font-bold leading-snug sm:text-base ${
                          isAvailable ? "text-[#281713]" : "text-[#81766f]"
                        }`}
                      >
                        {name}
                      </h3>

                      {item.kind === "product" ? (
                        <>
                          {item.product.description ? (
                            <p
                              className={`line-clamp-2 text-xs leading-5 ${
                                isAvailable ? "text-[#6d4a3a]" : "text-[#8b837c]"
                              }`}
                            >
                              {item.product.description}
                            </p>
                          ) : null}

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p
                              className={`text-sm font-black sm:text-base ${
                                isAvailable ? "text-[#c45a23]" : "text-[#81766f]"
                              }`}
                            >
                              {formatCurrency(item.product.price)}
                            </p>

                            {!isAvailable ? null : (() => {
                              const quantity = orderLines[item.product.id]?.quantity ?? 0;
                              return quantity === 0 ? (
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className="rounded-full bg-[#c45a23] text-white hover:bg-[#a94618]"
                                  onClick={() => addSimpleProduct(item.product)}
                                  aria-label={`Add ${item.product.name} to order list`}
                                >
                                  <Plus className="size-4" />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1 rounded-full bg-[#fff0dd] p-0.5">
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="rounded-full text-[#7a2f14] hover:bg-white"
                                    onClick={() => adjustQuantity(item.product.id, -1)}
                                    aria-label={`Remove one ${item.product.name}`}
                                  >
                                    <Minus className="size-3.5" />
                                  </Button>
                                  <span className="min-w-4 text-center text-xs font-bold text-[#7a2f14]">
                                    {quantity}
                                  </span>
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="rounded-full text-[#7a2f14] hover:bg-white"
                                    onClick={() => adjustQuantity(item.product.id, 1)}
                                    aria-label={`Add one more ${item.product.name}`}
                                  >
                                    <Plus className="size-3.5" />
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        <>
                          <p
                            className={`text-xs leading-5 ${
                              isAvailable ? "text-[#6d4a3a]" : "text-[#8b837c]"
                            }`}
                          >
                            Choose {item.choice.includedFlavorCount} flavor
                            {item.choice.includedFlavorCount === 1 ? "" : "s"}
                            {item.choice.supportsSides ? " + a side" : ""}. Extra flavors +
                            {formatCurrency(10)} each.
                          </p>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p
                              className={`text-sm font-black sm:text-base ${
                                isAvailable ? "text-[#c45a23]" : "text-[#81766f]"
                              }`}
                            >
                              {formatCurrency(item.noSideProduct.price)}
                              {item.choice.supportsSides && item.withSideProduct ? (
                                <span className="ml-1 text-[10px] font-normal text-[#8b7462]">
                                  solo / {formatCurrency(item.withSideProduct.price)} w/ side
                                </span>
                              ) : null}
                            </p>

                            {isAvailable ? (
                              <div className="flex items-center gap-1.5">
                                {orderedQuantityForChoice(item.choice.key) > 0 ? (
                                  <span className="grid size-5 place-items-center rounded-full bg-[#7a2f14] text-[10px] font-bold text-white">
                                    {orderedQuantityForChoice(item.choice.key)}
                                  </span>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-[#c45a23] px-3 text-xs text-white hover:bg-[#a94618]"
                                  onClick={() => openWingCustomizer(item)}
                                >
                                  Customize
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {groupedItems.length === 0 ? (
          <div className="rounded-2xl border border-[#e7c7a8] bg-white p-8 text-center text-[#6d4a3a]">
            No menu items found. Try a different search or category.
          </div>
        ) : null}
      </section>

      {orderCount > 0 ? (
        <button
          type="button"
          onClick={() => setIsOrderSheetOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-[#7a2f14] px-5 py-3.5 text-white shadow-lg transition active:scale-[0.98] sm:inset-x-auto sm:right-6"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="size-4" />
            {orderCount} item{orderCount === 1 ? "" : "s"}
          </span>
          <span className="text-sm font-black">{formatCurrency(orderTotal)}</span>
        </button>
      ) : null}

      <Sheet open={isOrderSheetOpen} onOpenChange={setIsOrderSheetOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[80vh] max-w-2xl rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Your order list</SheetTitle>
          </SheetHeader>

          <div className="grid gap-3 overflow-y-auto px-4">
            {orderLinesList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing added yet.
              </p>
            ) : (
              orderLinesList.map((line) => {
                const image = productsById.get(line.productId)?.imageSrc;
                return (
                  <div key={line.key} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#fff1d9]">
                      {image ? (
                        <Image src={image} alt={line.name} fill sizes="56px" className="object-contain p-1" />
                      ) : null}
                    </div>
                    <div className="grid flex-1 gap-0.5">
                      <p className="text-sm font-semibold leading-tight">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(line.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => adjustQuantity(line.key, -1)}
                        aria-label={`Remove one ${line.name}`}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="min-w-4 text-center text-xs font-bold">{line.quantity}</span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => adjustQuantity(line.key, 1)}
                        aria-label={`Add one more ${line.name}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeLine(line.key)}
                      aria-label={`Remove ${line.name} from order list`}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {orderLinesList.length > 0 ? (
            <SheetFooter className="gap-3 border-t pt-3">
              <p className="rounded-lg bg-muted p-2.5 text-center text-xs text-muted-foreground">
                Show this list to our staff at the counter to place your order.
              </p>
              <div className="flex items-center justify-between text-base font-black">
                <span>Total</span>
                <span className="text-[#c45a23]">{formatCurrency(orderTotal)}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={clearOrder}
              >
                <Trash2 className="size-4" />
                Clear list
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={customizingChoice !== null}
        onOpenChange={(open) => !open && setCustomizingChoice(null)}
      >
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{customizingChoice ? displayName(customizingChoice) : "Customize"}</DialogTitle>
          </DialogHeader>

          {customizingChoice ? (
            <div className="grid gap-5">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-2xl font-bold">{formatCurrency(dialogPrice)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Base {formatCurrency(dialogResolvedProduct?.price ?? 0)}
                  {dialogExtraCharge > 0
                    ? ` + ${formatCurrency(dialogExtraCharge)} extra flavors`
                    : ""}
                </p>
              </div>

              {customizingChoice.choice.supportsSides ? (
                <div className="grid gap-2">
                  <Label>Side</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {WING_SIDE_OPTIONS.map((side) => {
                      const product =
                        side === "No side" ? customizingChoice.noSideProduct : customizingChoice.withSideProduct;
                      const isDisabled = !product?.isAvailable;

                      return (
                        <Button
                          key={side}
                          type="button"
                          variant={selectedSide === side ? "default" : "outline"}
                          disabled={isDisabled}
                          onClick={() => setSelectedSide(side)}
                          className="justify-start"
                        >
                          {side}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {customizingChoice.choice.supportsSides && selectedSide === "Fries" ? (
                <div className="grid gap-2">
                  <Label>Fries flavor</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRIES_FLAVOR_OPTIONS.map((flavor) => (
                      <Button
                        key={flavor}
                        type="button"
                        variant={selectedFriesFlavor === flavor ? "default" : "outline"}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Wings flavors</Label>
                  <Badge variant="secondary">
                    {customizingChoice.choice.includedFlavorCount} included
                    {dialogExtraCharge > 0 ? ` / +${formatCurrency(dialogExtraCharge)}` : ""}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose one or more flavors. Plain doesn&apos;t count toward extra flavor
                  charges.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {WING_FLAVOR_OPTIONS.map((flavor) => {
                    const isSelected = selectedFlavors.includes(flavor);

                    return (
                      <Button
                        key={flavor}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => toggleFlavor(flavor)}
                        className="h-auto justify-start whitespace-normal py-2 text-left"
                      >
                        <span className="flex w-full items-center gap-2">
                          <span className="flex-1">{flavor}</span>
                          {isBestSellerWingFlavor(flavor) ? (
                            <BadgeCheck className="size-4 text-emerald-600" />
                          ) : null}
                          {isSpicyWingFlavor(flavor) ? (
                            <Flame className="size-4 text-destructive" />
                          ) : null}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                onClick={addCustomizedWing}
                disabled={!dialogResolvedProduct?.isAvailable || selectedFlavors.length === 0}
              >
                Add to order list
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
