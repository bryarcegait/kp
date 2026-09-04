"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  upsertMenuProduct,
  type MenuProductFormState,
} from "@/app/(app)/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type MenuProductFormValues = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isBestSeller: boolean;
  isSpicy: boolean;
  sortOrder: number;
};

const initialState: MenuProductFormState = {};

// Caps the square output so a huge source photo doesn't turn into an
// unnecessarily large upload — 1024px is plenty for how big these ever
// render on the public menu.
const MAX_SQUARE_SIZE = 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** Center-crops an image to a square so every menu photo lines up the same
 * way in the grid, instead of staff having to crop it themselves first. */
async function cropImageToSquare(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const outputSize = Math.min(side, MAX_SQUARE_SIZE);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type || "image/png", 0.92)
  );
  if (!blob) return file;

  return new File([blob], file.name, { type: blob.type });
}

export function MenuProductForm({
  product,
  categories,
  onSuccess,
}: {
  product?: MenuProductFormValues | null;
  categories: string[];
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertMenuProduct,
    initialState
  );
  const wasPending = useRef(false);
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isBestSeller, setIsBestSeller] = useState(product?.isBestSeller ?? false);
  const [isSpicy, setIsSpicy] = useState(product?.isSpicy ?? false);
  const [isCropping, setIsCropping] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreviewUrl(null);
      return;
    }

    setIsCropping(true);
    try {
      const squared = await cropImageToSquare(file);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(squared);
      event.target.files = dataTransfer.files;
      setImagePreviewUrl(URL.createObjectURL(squared));
    } catch {
      // Fall back to the original, uncropped file if anything goes wrong.
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <form action={formAction} className="grid gap-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input
        type="hidden"
        name="isAvailable"
        value={isAvailable ? "true" : "false"}
      />
      <input
        type="hidden"
        name="isBestSeller"
        value={isBestSeller ? "true" : "false"}
      />
      <input type="hidden" name="isSpicy" value={isSpicy ? "true" : "false"} />

      <div className="grid gap-2">
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            list="menu-categories"
            defaultValue={product?.category}
            placeholder="e.g. Wings"
            required
          />
          <datalist id="menu-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          {state.fieldErrors?.category ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.category}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="price">Price (₱)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
          />
          {state.fieldErrors?.price ? (
            <p className="text-sm text-destructive">{state.fieldErrors.price}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product?.description ?? ""}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.sortOrder ?? 0}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="available-switch">Available</Label>
            <p className="text-xs text-muted-foreground">
              Off means greyed out on the public menu.
            </p>
          </div>
          <Switch
            id="available-switch"
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="best-seller-switch">Best Seller</Label>
            <p className="text-xs text-muted-foreground">
              Shows a Best Seller badge on the public menu.
            </p>
          </div>
          <Switch
            id="best-seller-switch"
            checked={isBestSeller}
            onCheckedChange={setIsBestSeller}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="spicy-switch">Spicy</Label>
            <p className="text-xs text-muted-foreground">
              Shows a Spicy badge on the public menu.
            </p>
          </div>
          <Switch id="spicy-switch" checked={isSpicy} onCheckedChange={setIsSpicy} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="image">Product image</Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageChange}
        />
        {isCropping ? (
          <p className="text-xs text-muted-foreground">Cropping to a square...</p>
        ) : imagePreviewUrl ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview of an in-memory file, not eligible for next/image */}
            <img
              src={imagePreviewUrl}
              alt="New product image preview"
              width={56}
              height={56}
              className="size-14 rounded-md object-contain"
            />
            <p className="text-xs text-muted-foreground">
              New image, auto-cropped to a square. This replaces the current
              image when saved.
            </p>
          </div>
        ) : product?.imageUrl ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={56}
              height={56}
              className="size-14 rounded-md object-contain"
            />
            <p className="text-xs text-muted-foreground">
              Current image. Upload a new image to replace it.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Optional image, PNG/JPG/WebP up to 5MB — automatically cropped to a
            square.
          </p>
        )}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || isCropping}>
        {isPending ? "Saving..." : product ? "Save product" : "Add product"}
      </Button>
    </form>
  );
}
