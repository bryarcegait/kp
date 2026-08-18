export type CustomerMenuItem = {
  id: string;
  name: string;
  price: number;
  category: "Silog";
};

export const SILOG_MEALS: CustomerMenuItem[] = [
  { id: "tapsilog", name: "Tapsilog", price: 130, category: "Silog" },
  { id: "tocilog", name: "Tocilog", price: 140, category: "Silog" },
  { id: "porksilog", name: "Porksilog", price: 140, category: "Silog" },
  { id: "chicksilog", name: "Chicksilog", price: 150, category: "Silog" },
  { id: "bangsilog", name: "Bangsilog", price: 130, category: "Silog" },
  { id: "bacsilog", name: "Bacsilog", price: 130, category: "Silog" },
  { id: "hungsilog", name: "Hungsilog", price: 130, category: "Silog" },
];

export function getMenuItem(id: string) {
  return SILOG_MEALS.find((item) => item.id === id);
}
