const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatCurrency(amount: number | string) {
  return currencyFormatter.format(Number(amount));
}

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
});

export function formatDate(date: Date | string) {
  return dateFormatter.format(new Date(date));
}
