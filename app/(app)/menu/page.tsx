import { redirect } from "next/navigation";
import { MenuProductsClient, type MenuProductRow } from "@/components/menu/menu-products-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export default async function MenuPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasPermission(session.user.permissions, "menu.manage")) redirect("/dashboard");

  const products = await db.menuProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  const rows: MenuProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description ?? "",
    price: Number(product.price).toFixed(2),
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    sortOrder: product.sortOrder,
  }));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ordering Menu</h1>
        <p className="text-muted-foreground">
          Manage products shown on the public ordering page.
        </p>
      </div>

      <MenuProductsClient products={rows} />
    </div>
  );
}
