"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingBag, Trash2, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import type { CustomerMenuProduct } from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ORDER_LIST_STORAGE_KEY = "kp_order_list";

function readStoredOrderList(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ORDER_LIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function PublicMenuClient({
  products,
}: {
  products: CustomerMenuProduct[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Deferred rather than called directly so the first paint still matches
    // the server-rendered (empty) state before localStorage is applied.
    const timeout = setTimeout(() => {
      setOrderQuantities(readStoredOrderList());
      setHasHydrated(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(ORDER_LIST_STORAGE_KEY, JSON.stringify(orderQuantities));
    } catch {
      // Best-effort only — an order list that doesn't persist isn't worth failing over.
    }
  }, [orderQuantities, hasHydrated]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products]
  );

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, CustomerMenuProduct[]>();
    for (const product of visibleProducts) {
      groups.set(product.category, [...(groups.get(product.category) ?? []), product]);
    }
    return Array.from(groups.entries());
  }, [visibleProducts]);

  const orderLines = useMemo(() => {
    return Object.entries(orderQuantities)
      .map(([productId, quantity]) => {
        const product = productsById.get(productId);
        return product && quantity > 0 ? { product, quantity } : null;
      })
      .filter((line): line is { product: CustomerMenuProduct; quantity: number } => line !== null);
  }, [orderQuantities, productsById]);

  const orderCount = orderLines.reduce((sum, line) => sum + line.quantity, 0);
  const orderTotal = orderLines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  function setQuantity(productId: string, quantity: number) {
    setOrderQuantities((previous) => {
      const next = { ...previous };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  }

  function addToOrder(product: CustomerMenuProduct) {
    setQuantity(product.id, (orderQuantities[product.id] ?? 0) + 1);
    toast.success(`Added ${product.name} to your order list`);
  }

  function clearOrder() {
    setOrderQuantities({});
    setIsOrderSheetOpen(false);
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
        {groupedProducts.map(([category, items]) => (
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
              {items.map((product) => {
                const quantity = orderQuantities[product.id] ?? 0;

                return (
                  <article
                    key={product.id}
                    className={`grid overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                      product.isAvailable ? "border-[#e7c7a8]" : "border-[#d1c8be] bg-[#f1eee9]"
                    }`}
                  >
                    <div className="relative aspect-square bg-[#fff1d9]">
                      <Image
                        src={product.imageSrc}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                        className={`object-contain p-3 ${
                          product.isAvailable ? "" : "grayscale opacity-45"
                        }`}
                      />
                      {!product.isAvailable ? (
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
                          product.isAvailable ? "text-[#281713]" : "text-[#81766f]"
                        }`}
                      >
                        {product.name}
                      </h3>
                      {product.description ? (
                        <p
                          className={`line-clamp-2 text-xs leading-5 ${
                            product.isAvailable ? "text-[#6d4a3a]" : "text-[#8b837c]"
                          }`}
                        >
                          {product.description}
                        </p>
                      ) : null}

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-black sm:text-base ${
                            product.isAvailable ? "text-[#c45a23]" : "text-[#81766f]"
                          }`}
                        >
                          {formatCurrency(product.price)}
                        </p>

                        {!product.isAvailable ? null : quantity === 0 ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            className="rounded-full bg-[#c45a23] text-white hover:bg-[#a94618]"
                            onClick={() => addToOrder(product)}
                            aria-label={`Add ${product.name} to order list`}
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
                              onClick={() => setQuantity(product.id, quantity - 1)}
                              aria-label={`Remove one ${product.name}`}
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
                              onClick={() => setQuantity(product.id, quantity + 1)}
                              aria-label={`Add one more ${product.name}`}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {groupedProducts.length === 0 ? (
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
            {orderLines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing added yet.
              </p>
            ) : (
              orderLines.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#fff1d9]">
                    <Image
                      src={product.imageSrc}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="grid flex-1 gap-0.5">
                    <p className="text-sm font-semibold leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(product.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setQuantity(product.id, quantity - 1)}
                      aria-label={`Remove one ${product.name}`}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="min-w-4 text-center text-xs font-bold">{quantity}</span>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setQuantity(product.id, quantity + 1)}
                      aria-label={`Add one more ${product.name}`}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setQuantity(product.id, 0)}
                    aria-label={`Remove ${product.name} from order list`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {orderLines.length > 0 ? (
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
    </main>
  );
}
