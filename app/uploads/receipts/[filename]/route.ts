import { readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safeFilename = path.basename(filename);

  if (safeFilename !== filename) {
    notFound();
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  if (!contentType) {
    notFound();
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "receipts",
      safeFilename
    );
    const file = await readFile(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    notFound();
  }
}
