import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// In production (Vercel) this uploads to Vercel Blob. In local dev, when no
// blob token is configured yet, it falls back to writing into public/uploads/
// so upload flows can still be tested end to end.
async function uploadPublicFile(folder: string, file: File): Promise<string> {
  const ext = path.extname(file.name) || "";
  const filename = `${folder}/${crypto.randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, { access: "public" });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadsDir, { recursive: true });
  const diskName = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, diskName), buffer);
  return `/uploads/${folder}/${diskName}`;
}

export async function uploadReceipt(file: File): Promise<string> {
  return uploadPublicFile("receipts", file);
}

export async function uploadMenuImage(file: File): Promise<string> {
  return uploadPublicFile("menu", file);
}
