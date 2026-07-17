export type InventoryItemType = "single" | "carton" | "service";

export const INVENTORY_ITEM_TYPES = ["single", "carton", "service"] as const;

export function isServiceItem(type?: string | null): type is "service" {
  return type === "service";
}

export function isStockTrackedItem(type?: string | null): boolean {
  return !isServiceItem(type);
}
