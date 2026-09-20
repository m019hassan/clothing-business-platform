import { PlaceholderPage } from "@/components/placeholder-page";

export default function OrdersPage() {
  return (
    <PlaceholderPage
      title="Orders"
      description="The full order management screen will be implemented in a later phase, using the existing order APIs."
      items={[
        "Order list with status filters",
        "Order detail with items and totals",
        "Payment status and lifecycle actions",
      ]}
    />
  );
}
