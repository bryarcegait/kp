"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Flame, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteMenuProduct,
  setMenuProductAvailability,
} from "@/app/(app)/menu/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategoryImageFallback } from "@/lib/customer-menu";
import { formatCurrency } from "@/lib/format";
import {
  MenuProductForm,
  type MenuProductFormValues,
} from "./menu-product-form";

export type MenuProductRow = MenuProductFormValues;

export function MenuProductsClient({ products }: { products: MenuProductRow[] }) {
  const router = useRouter();
  const [dialogTarget, setDialogTarget] = useState<"new" | MenuProductRow | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<MenuProductRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isMutating, startMutation] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, products, searchQuery]);

  function handleAvailabilityChange(product: MenuProductRow, isAvailable: boolean) {
    startMutation(async () => {
      const result = await setMenuProductAvailability(product.id, isAvailable);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isAvailable ? "Product is available" : "Product is unavailable");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;

    startMutation(async () => {
      const result = await deleteMenuProduct(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Product deleted");
        setDeleteTarget(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search product or category"
          />
          <Button onClick={() => setDialogTarget("new")}>
            <Plus className="size-4" /> Add Product
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...categories].map((category) => (
            <Button
              key={category}
              type="button"
              variant={categoryFilter === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex min-w-72 items-center gap-3">
                    <Image
                      src={product.imageUrl ?? getCategoryImageFallback(product.category)}
                      alt={product.name}
                      width={56}
                      height={56}
                      className="size-14 shrink-0 rounded-lg border bg-muted object-contain p-1"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold">{product.name}</p>
                        {product.isBestSeller ? (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                            <Star className="size-3" /> Best Seller
                          </Badge>
                        ) : null}
                        {product.isSpicy ? (
                          <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100">
                            <Flame className="size-3" /> Spicy
                          </Badge>
                        ) : null}
                      </div>
                      {product.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(Number(product.price))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={product.isAvailable}
                      disabled={isMutating}
                      onCheckedChange={(checked) =>
                        handleAvailabilityChange(product, checked)
                      }
                    />
                    <Badge variant={product.isAvailable ? "default" : "secondary"}>
                      {product.isAvailable ? "Available" : "Not available"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.sortOrder}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit product"
                      onClick={() => setDialogTarget(product)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete product"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredProducts.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No products found.
          </div>
        ) : null}
      </div>

      <Dialog
        open={dialogTarget !== null}
        onOpenChange={(open) => !open && setDialogTarget(null)}
      >
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogTarget === "new" ? "Add Product" : "Edit Product"}
            </DialogTitle>
          </DialogHeader>
          <MenuProductForm
            key={dialogTarget === "new" ? "new" : dialogTarget?.id}
            product={dialogTarget && dialogTarget !== "new" ? dialogTarget : null}
            categories={categories}
            onSuccess={() => {
              toast.success(
                dialogTarget === "new" ? "Product added" : "Product updated"
              );
              setDialogTarget(null);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be removed from the public menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isMutating}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
