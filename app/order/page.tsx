import { PublicMenuClient } from "@/components/public-menu/public-menu-client";
import { db } from "@/lib/db";
import { getCategoryImageFallback } from "@/lib/customer-menu";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage() {
  const products = await db.menuProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return (
    <PublicMenuClient
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description ?? "",
        price: Number(product.price),
        imageSrc: product.imageUrl ?? getCategoryImageFallback(product.category),
        isAvailable: product.isAvailable,
        isBestSeller: product.isBestSeller,
        isSpicy: product.isSpicy,
      }))}
    />
  );
}
