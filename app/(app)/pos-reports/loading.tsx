import { KitchenLoader } from "@/components/layout/kitchen-loader";

export default function Loading() {
  return (
    <KitchenLoader
      label="Cooking the POS report..."
      detail="Checking cash, card, and delivery totals."
    />
  );
}
