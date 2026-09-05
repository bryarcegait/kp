import { db } from "./lib/db.ts";

const products = await db.menuProduct.findMany({
  where: { imageUrl: { not: null } },
  select: { name: true, category: true, imageUrl: true },
  take: 20,
});
console.log(JSON.stringify(products, null, 2));
