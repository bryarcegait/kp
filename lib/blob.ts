import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// In production (Vercel) this uploads to Vercel Blob. In local dev, when no
// blob token is configured yet, it falls back to writing into
// public/uploads/ so the receipt upload flow can still be tested end to end.
export async function uploadReceipt(file: File): Promise<string> {
  const ext = path.extname(file.name) || "";
  const filename = `receipts/${crypto.randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, { access: "public" });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "receipts");
  await mkdir(uploadsDir, { recursive: true });
  const diskName = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, diskName), buffer);
  return `/uploads/receipts/${diskName}`;
}
