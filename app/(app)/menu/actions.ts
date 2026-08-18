"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { uploadMenuImage } from "@/lib/blob";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MENU_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const menuProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Product name is required").max(150),
  category: z.string().trim().min(1, "Category is required").max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative").max(999_999_999),
  sortOrder: z.coerce.number().int().min(0).max(999_999),
  isAvailable: z.enum(["true", "false"]),
});

export type MenuProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireMenuManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!hasPermission(session.user.permissions, "menu.manage")) {
    return { error: "You don't have permission to manage menu products." } as const;
  }
  return { session } as const;
}

function revalidateMenu() {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/api/customer-menu");
}

export async function upsertMenuProduct(
  _prevState: MenuProductFormState,
  formData: FormData
): Promise<MenuProductFormState> {
  const guard = await requireMenuManager();
  if ("error" in guard) return { error: guard.error };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;
  const parsed = menuProductSchema.safeParse({
    id: isEdit ? id : undefined,
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    sortOrder: formData.get("sortOrder") ?? "0",
    isAvailable: formData.get("isAvailable") ?? "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  let imageUrl: string | undefined;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_MENU_IMAGE_BYTES) {
      return { error: "Image file is too large (max 5MB)." };
    }
    if (!ALLOWED_MENU_IMAGE_TYPES.includes(image.type)) {
      return { error: "Image must be PNG, JPG, or WebP." };
    }
    imageUrl = await uploadMenuImage(image);
  }

  const data = {
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    price: parsed.data.price,
    sortOrder: parsed.data.sortOrder,
    isAvailable: parsed.data.isAvailable === "true",
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (isEdit) {
    await db.menuProduct.update({ where: { id: parsed.data.id! }, data });
  } else {
    await db.menuProduct.create({ data });
  }

  revalidateMenu();
  return {};
}

export async function deleteMenuProduct(id: string): Promise<{ error?: string }> {
  const guard = await requireMenuManager();
  if ("error" in guard) return { error: guard.error };

  await db.menuProduct.delete({ where: { id } });
  revalidateMenu();
  return {};
}

export async function setMenuProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<{ error?: string }> {
  const guard = await requireMenuManager();
  if ("error" in guard) return { error: guard.error };

  await db.menuProduct.update({ where: { id }, data: { isAvailable } });
  revalidateMenu();
  return {};
}
