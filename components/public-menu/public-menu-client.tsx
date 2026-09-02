"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, WalletCards } from "lucide-react";
import type { CustomerMenuProduct } from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicMenuClient({
  products,
}: {
  products: CustomerMenuProduct[];
}) {
  const [selectedCategory, setSelectedCategory] = useState(
    products[0]?.category ?? "Menu"
  );
  const [searchQuery, setSearchQuery] = useState("");

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

          <Button asChild className="h-10 bg-[#c45a23] px-4 text-white hover:bg-[#a94618]">
            <Link href="/">
              <WalletCards className="size-4" />
              eLoyalty Card
            </Link>
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
    </main>
  );
}
