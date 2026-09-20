import { PlaceholderPage } from "@/components/placeholder-page";

export default function CartPage() {
  return (
    <PlaceholderPage
      title="Cart"
      description="The shopping cart screen will be implemented in a later phase, using the existing cart API."
      items={[
        "Cart items with live prices and availability",
        "Quantity updates and item removal",
        "Order creation from the active cart",
      ]}
    />
  );
}
