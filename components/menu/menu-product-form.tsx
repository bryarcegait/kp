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
  sortOrder: number;
};

const initialState: MenuProductFormState = {};

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

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input
        type="hidden"
        name="isAvailable"
        value={isAvailable ? "true" : "false"}
      />

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

      <div className="grid gap-2">
        <Label htmlFor="image">Product image</Label>
        <Input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
        {product?.imageUrl ? (
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
            Optional image, PNG/JPG/WebP up to 5MB.
          </p>
        )}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : product ? "Save product" : "Add product"}
      </Button>
    </form>
  );
}
