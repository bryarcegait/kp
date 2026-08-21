"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  Gift,
  History,
  LogIn,
  Search,
  Sparkles,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  loginCustomerLoyalty,
  signupCustomerLoyalty,
  type CustomerLoyaltyCard,
} from "@/app/customer-loyalty-actions";
import type { CustomerMenuProduct } from "@/lib/customer-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LoyaltyMode = "login" | "signup";

const REWARD_ROWS = [
  { start: 0, rewardAt: 5 },
  { start: 5, rewardAt: 10 },
];

export function PublicMenuClient({
  products,
}: {
  products: CustomerMenuProduct[];
}) {
  const [selectedCategory, setSelectedCategory] = useState(
    products[0]?.category ?? "Menu"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [loyaltyMode, setLoyaltyMode] = useState<LoyaltyMode>("login");
  const [loyaltyCard, setLoyaltyCard] = useState<CustomerLoyaltyCard | null>(null);
  const [loyaltyError, setLoyaltyError] = useState("");
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products]
  );

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

  function openLoyalty(mode: LoyaltyMode) {
    setLoyaltyMode(mode);
    setLoyaltyError("");
    setIsLoyaltyOpen(true);
  }

  function handleLoyaltySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoyaltyError("");

    startTransition(async () => {
      const result =
        loyaltyMode === "login"
          ? await loginCustomerLoyalty(formData)
          : await signupCustomerLoyalty(formData);

      if (result.error) {
        setLoyaltyError(result.error);
        toast.error(result.error);
        return;
      }

      setLoyaltyCard(result.card ?? null);
      toast.success(
        loyaltyMode === "login"
          ? "eLoyalty card loaded"
          : "eLoyalty account created"
      );
    });
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] text-[#281713]">
      <header className="sticky top-0 z-30 border-b border-[#e7c7a8] bg-[#fff8ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/kanto-logo.png"
              alt="Kanto't Pakpakan"
              width={52}
              height={52}
              className="size-12 rounded-full bg-white object-contain p-1 shadow-sm"
              priority
            />
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide sm:text-2xl">
                Kanto&apos;t Pakpakan
              </h1>
              <p className="text-sm font-medium text-[#8b3f1d]">Restaurant Menu</p>
            </div>
          </div>

          <Button
            type="button"
            className="h-10 bg-[#c45a23] px-4 text-white hover:bg-[#a94618]"
            onClick={() => openLoyalty("login")}
          >
            <WalletCards className="size-4" />
            eLoyalty Card
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="grid gap-3 border-y border-[#e7c7a8] py-4 lg:border-y-0 lg:border-r lg:pr-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b3f1d]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search menu"
                className="h-11 border-[#d8a77a] bg-white pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
              {["All", ...categories].map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={
                    selectedCategory === category
                      ? "justify-start bg-[#c45a23] text-white hover:bg-[#a94618]"
                      : "justify-start border-[#d8a77a] bg-white text-[#5b2a18] hover:bg-[#fff0dd]"
                  }
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <div className="grid gap-8">
          {groupedProducts.map(([category, items]) => (
            <section key={category} className="grid gap-4">
              <div className="flex items-end justify-between gap-3 border-b-2 border-[#c45a23] pb-2">
                <h2 className="font-serif text-3xl font-black text-[#7a2f14] sm:text-4xl">
                  {category}
                </h2>
                <span className="text-sm font-semibold text-[#8b3f1d]">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <article
                    key={product.id}
                    className={`overflow-hidden border bg-white shadow-sm transition ${
                      product.isAvailable
                        ? "border-[#e7c7a8]"
                        : "border-[#d1c8be] bg-[#f1eee9]"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-[#fff1d9]">
                      <Image
                        src={product.imageSrc}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                        className={`object-contain p-2 ${
                          product.isAvailable ? "" : "grayscale opacity-45"
                        }`}
                      />
                      {!product.isAvailable ? (
                        <div className="absolute inset-0 grid place-items-center bg-white/45">
                          <Badge variant="secondary" className="text-sm">
                            Unavailable
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`text-lg font-black leading-tight ${
                            product.isAvailable
                              ? "text-[#281713]"
                              : "text-[#81766f]"
                          }`}
                        >
                          {product.name}
                        </h3>
                        <p
                          className={`shrink-0 text-lg font-black ${
                            product.isAvailable
                              ? "text-[#c45a23]"
                              : "text-[#81766f]"
                          }`}
                        >
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      {product.description ? (
                        <p
                          className={`line-clamp-3 text-sm leading-6 ${
                            product.isAvailable
                              ? "text-[#6d4a3a]"
                              : "text-[#8b837c]"
                          }`}
                        >
                          {product.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {groupedProducts.length === 0 ? (
            <div className="border border-[#e7c7a8] bg-white p-8 text-center text-[#6d4a3a]">
              No menu items found.
            </div>
          ) : null}
        </div>
      </section>

      <Dialog open={isLoyaltyOpen} onOpenChange={setIsLoyaltyOpen}>
        <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WalletCards className="size-5 text-[#c45a23]" />
              eLoyalty Card
            </DialogTitle>
          </DialogHeader>

          {loyaltyCard ? (
            <div className="grid gap-4">
              <LoyaltyCardView card={loyaltyCard} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLoyaltyCard(null);
                    setLoyaltyMode("login");
                  }}
                >
                  Use another number
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={loyaltyMode === "login" ? "default" : "outline"}
                    onClick={() => {
                      setLoyaltyMode("login");
                      setLoyaltyError("");
                    }}
                  >
                    <LogIn className="size-4" />
                    Login
                  </Button>
                  <Button
                    type="button"
                    variant={loyaltyMode === "signup" ? "default" : "outline"}
                    onClick={() => {
                      setLoyaltyMode("signup");
                      setLoyaltyError("");
                    }}
                  >
                    <UserPlus className="size-4" />
                    Sign up
                  </Button>
                </div>

                <form onSubmit={handleLoyaltySubmit} className="mt-4 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="loyalty-phone">Phone number</Label>
                    <Input
                      id="loyalty-phone"
                      name="phoneNumber"
                      inputMode="tel"
                      required
                    />
                  </div>

                  {loyaltyMode === "signup" ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="loyalty-name">Name</Label>
                        <Input id="loyalty-name" name="displayName" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="loyalty-address">Address</Label>
                        <Textarea id="loyalty-address" name="address" rows={3} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="loyalty-email">Email</Label>
                          <Input id="loyalty-email" name="email" type="email" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="loyalty-birthday">Birthday</Label>
                          <Input id="loyalty-birthday" name="birthday" type="date" />
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor="loyalty-password">Password</Label>
                    <Input
                      id="loyalty-password"
                      name="password"
                      type="password"
                      minLength={6}
                      required
                    />
                  </div>

                  {loyaltyError ? (
                    <p className="text-sm font-medium text-destructive" role="alert">
                      {loyaltyError}
                    </p>
                  ) : null}

                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? "Please wait..."
                      : loyaltyMode === "login"
                        ? "Open eLoyalty Card"
                        : "Create eLoyalty Card"}
                  </Button>
                </form>
              </div>

              <LoyaltyCardPreview />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function LoyaltyCardPreview() {
  return (
    <div className="hidden overflow-hidden rounded-xl bg-[#fb8428] p-5 text-[#7a2f14] lg:grid">
      <div className="grid gap-5">
        <div className="grid gap-2">
          <p className="text-4xl font-black tracking-wide">KP CARD</p>
          <p className="max-w-md text-xl">
            Participate, try your best, and shine. Fill this card with kp stamps
            to earn a special reward.
          </p>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="grid aspect-square place-items-center rounded-3xl bg-[#fff4d5]"
            >
              {index < 3 ? (
                <Image
                  src="/kanto-logo.png"
                  alt=""
                  width={74}
                  height={74}
                  className="size-18 object-contain opacity-80"
                />
              ) : index === 5 || index === 11 ? (
                <Gift className="size-14 text-[#e89362]" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoyaltyCardView({ card }: { card: CustomerLoyaltyCard }) {
  const points = card.loyaltyPoints;

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-xl bg-[#fb8428] p-5 text-[#7a2f14] shadow-sm sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-5xl font-black tracking-wide sm:text-7xl">KP CARD</p>
            <p className="mt-4 max-w-2xl text-xl leading-relaxed sm:text-3xl">
              Participate, try your best, and shine. Fill this card with kp
              stamps to earn a special reward.
            </p>
          </div>
          <div className="self-start">
            <p className="text-xl sm:text-3xl">This card belongs to:</p>
            <p className="mt-3 border-b-4 border-[#fff4d5] pb-2 font-serif text-4xl italic sm:text-5xl">
              {card.displayName}
            </p>
            <p className="mt-3 text-sm font-semibold">Phone: {card.phoneNumber}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {REWARD_ROWS.map((row) => (
            <div key={row.rewardAt} className="grid grid-cols-6 gap-3 sm:gap-5">
              {Array.from({ length: 5 }).map((_, offset) => {
                const stampNumber = row.start + offset + 1;
                const isEarned = points >= stampNumber;

                return (
                  <div
                    key={stampNumber}
                    className="grid aspect-square place-items-center rounded-3xl bg-[#fff4d5]"
                  >
                    {isEarned ? (
                      <Image
                        src="/kanto-logo.png"
                        alt=""
                        width={120}
                        height={120}
                        className="size-16 object-contain sm:size-24"
                      />
                    ) : null}
                  </div>
                );
              })}
              <div className="grid aspect-square place-items-center rounded-3xl bg-[#fff4d5]">
                <Gift
                  className={`size-14 sm:size-24 ${
                    points >= row.rewardAt ? "text-[#c45a23]" : "text-[#e89362]"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold sm:text-base">
          <Badge className="bg-[#7a2f14] text-white hover:bg-[#7a2f14]">
            {points} current stamp{points === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
            {card.lifetimePoints} lifetime
          </Badge>
          {card.nextRewardStamps ? (
            <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
              Next reward at {card.nextRewardStamps}
            </Badge>
          ) : (
            <Badge className="bg-[#fff4d5] text-[#7a2f14] hover:bg-[#fff4d5]">
              Reward available
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 font-semibold">
          <History className="size-4 text-primary" />
          Recent stamp activity
        </div>
        {card.latestTransactions.length > 0 ? (
          <div className="grid gap-2">
            {card.latestTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 font-medium">
                  <span>
                    {transaction.points > 0 ? "+" : ""}
                    {transaction.points} stamp
                    {Math.abs(transaction.points) === 1 ? "" : "s"}
                  </span>
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">
                  {transaction.remarks ?? transaction.rewardName ?? transaction.type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            No stamp activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
