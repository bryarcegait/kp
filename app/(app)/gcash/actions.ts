"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageGcash } from "@/lib/gcash-access";
import { uploadReceipt } from "@/lib/blob";
import { toDateOnly, parseInputDate } from "@/lib/dates";
import { saveLoyverseGcashSale } from "@/lib/loyverse";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const gcashEntrySchema = z.object({
  id: z.string().optional(),
  entryType: z.enum(["remittance", "expense"]),
  businessDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1, "Name is required").max(200),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(999_999_999),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type GcashFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

async function requireGcashManager() {
  const session = await auth();
  if (!session) return { error: "You must be signed in." } as const;
  if (!canManageGcash(session.user)) {
    return { error: "You don't have permission to manage GCash records." } as const;
  }
  return { session } as const;
}

function collectFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}

function revalidateGcash() {
  revalidatePath("/gcash");
}

export async function upsertGcashEntry(
  _prevState: GcashFormState,
  formData: FormData
): Promise<GcashFormState> {
  const guard = await requireGcashManager();
  if ("error" in guard) return { error: guard.error };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;
  const parsed = gcashEntrySchema.safeParse({
    id: isEdit ? id : undefined,
    entryType: formData.get("entryType"),
    businessDate: formData.get("businessDate"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  let existing: { receiptUrl: string } | null = null;
  if (isEdit) {
    existing = await db.gcashEntry.findUnique({
      where: { id: parsed.data.id! },
      select: { receiptUrl: true },
    });
    if (!existing) return { error: "GCash entry not found." };
  }

  const receipt = formData.get("receipt");
  let receiptUrl = existing?.receiptUrl;
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return { error: "Receipt file is too large (max 5MB)." };
    }
    if (!ALLOWED_RECEIPT_TYPES.includes(receipt.type)) {
      return { error: "Receipt must be an image (PNG/JPG/WebP) or PDF." };
    }
    try {
      receiptUrl = await uploadReceipt(receipt);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Receipt upload failed. Please try another file.",
      };
    }
  }

  if (!receiptUrl) {
    return {
      error: "A GCash receipt is required.",
      fieldErrors: { receipt: "Upload a receipt for this entry." },
    };
  }

  const data = {
    entryType: parsed.data.entryType,
    businessDate: toDateOnly(parsed.data.businessDate),
    name: parsed.data.name,
    amount: Math.abs(parsed.data.amount),
    remarks: parsed.data.remarks || null,
    receiptUrl,
  };

  if (isEdit) {
    await db.gcashEntry.update({ where: { id: parsed.data.id! }, data });
  } else {
    await db.gcashEntry.create({
      data: { ...data, createdById: guard.session.user.id },
    });
  }

  revalidateGcash();
  return { success: isEdit ? "GCash entry updated." : "GCash entry added." };
}

export async function deleteGcashEntry(id: string): Promise<{ error?: string }> {
  const guard = await requireGcashManager();
  if ("error" in guard) return { error: guard.error };

  const existing = await db.gcashEntry.findUnique({ where: { id } });
  if (!existing) return { error: "GCash entry not found." };

  await db.gcashEntry.delete({ where: { id } });
  revalidateGcash();
  return {};
}

export async function syncGcashSales(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };
  if (!canManageGcash(session.user)) {
    return { error: "You don't have permission to sync POS data." };
  }

  const businessDate = parseInputDate(formData.get("businessDate"));

  try {
    await saveLoyverseGcashSale(businessDate);
    revalidateGcash();
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to sync Loyverse GCash sales.",
    };
  }
}
