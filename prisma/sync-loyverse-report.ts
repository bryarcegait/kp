import "dotenv/config";
import { db } from "../lib/db";
import { saveLoyverseDailyReport } from "../lib/loyverse";
import { formatInputDate } from "../lib/dates";

function getRequestedDate() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
  if (dateArg) {
    const value = dateArg.slice("--date=".length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("Date must be in YYYY-MM-DD format.");
    }

    return value;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatInputDate(yesterday);
}

function toDate(inputDate: string) {
  const [year, month, day] = inputDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

async function main() {
  const inputDate = getRequestedDate();
  const report = await saveLoyverseDailyReport(toDate(inputDate));

  console.log(
    JSON.stringify(
      {
        businessDate: inputDate,
        grossSales: report.grossSales.toString(),
        deliveryFeeTotal: report.deliveryFeeTotal.toString(),
        netSales: report.netSales.toString(),
        cashTotal: report.cashTotal.toString(),
        cardTotal: report.cardTotal.toString(),
        otherTotal: report.otherTotal.toString(),
        receiptCount: report.receiptCount,
        paymentCount: report.paymentCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
