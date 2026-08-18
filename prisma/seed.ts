import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";
import { DEFAULT_MENU_PRODUCTS } from "../lib/customer-menu";
import { toMariaDbUrl } from "../lib/db-url";

const adapter = new PrismaMariaDb(toMariaDbUrl(process.env.DATABASE_URL!));
const db = new PrismaClient({ adapter });

async function main() {
  for (const permission of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, module: permission.module },
      create: permission,
    });
  }

  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true },
    });

    const permissions = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const adminRole = await db.role.findUniqueOrThrow({
    where: { name: "System Admin" },
  });

  const passwordHash = await bcrypt.hash("dropDown", 10);

  await db.user.upsert({
    where: { username: "bryarcega" },
    update: {},
    create: {
      username: "bryarcega",
      passwordHash,
      fullName: "Bryan Arcega",
      roleId: adminRole.id,
      isActive: true,
    },
  });

  for (const product of DEFAULT_MENU_PRODUCTS) {
    await db.menuProduct.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
      },
      create: {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        isAvailable: product.isAvailable,
        sortOrder: product.sortOrder,
      },
    });
  }

  console.log("Seed complete: permissions, roles, admin user, and menu products are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
