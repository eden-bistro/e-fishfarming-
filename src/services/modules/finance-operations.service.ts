import { listExpenses, listIncome } from "@/lib/platform-clients";
import {
  expenseAmount,
  filterExpensesByDate,
  filterIncomeByDate,
  incomeAmount,
  isWithinDateRange,
  type DateRange,
} from "@/services/modules/finance-analytics.service";
import {
  listStockMovementsRemote,
  listInventoryItemsRemote,
} from "@/services/modules/inventory.service";
import { listProductionEventsRemote } from "@/services/modules/production.service";

export type OperationalFinanceSnapshot = {
  harvestedKg: number;
  soldKg: number;
  feedKg: number;
  inventoryFeedUsageKg: number;
  totalIncome: number;
  totalExpenses: number;
  feedExpenses: number;
  fingerlingExpenses: number;
  medicineExpenses: number;
  revenuePerKg: number;
  expensePerHarvestKg: number;
  feedCostPerKgFed: number;
  estimatedGrossMargin: number;
  range: DateRange;
};

function eventDate(value: string): string {
  return value.slice(0, 10);
}

function isCategory(rowCategory: string | undefined, expected: string): boolean {
  return (rowCategory ?? "").trim().toLowerCase() === expected.toLowerCase();
}

export async function buildOperationalFinanceSnapshot(
  range: DateRange,
): Promise<OperationalFinanceSnapshot> {
  const [incomeRows, expenseRows, productionEvents, inventoryItems, stockMovements] =
    await Promise.all([
      listIncome(),
      listExpenses(),
      listProductionEventsRemote(),
      listInventoryItemsRemote(),
      listStockMovementsRemote(),
    ]);

  const income = filterIncomeByDate(incomeRows, range);
  const expenses = filterExpensesByDate(expenseRows, range);
  const production = productionEvents.filter((event) =>
    isWithinDateRange(eventDate(event.createdAt), range),
  );
  const feedItemIds = new Set(
    inventoryItems.filter((item) => item.category === "feed").map((item) => item.id),
  );
  const feedMovements = stockMovements.filter(
    (movement) =>
      movement.type === "usage" &&
      feedItemIds.has(movement.itemId) &&
      isWithinDateRange(eventDate(movement.createdAt), range),
  );

  const harvestedKg = production
    .filter((event) => event.type === "harvest")
    .reduce((sum, event) => sum + (event.weightKg ?? 0), 0);
  const productionFeedKg = production
    .filter((event) => event.type === "feeding")
    .reduce((sum, event) => sum + (event.feedKg ?? 0), 0);
  const inventoryFeedUsageKg = feedMovements.reduce(
    (sum, movement) => sum + Math.abs(movement.quantity),
    0,
  );
  const feedKg = Math.max(productionFeedKg, inventoryFeedUsageKg);
  const soldKg = income.reduce((sum, row) => sum + Number(row.quantity_kg ?? 0), 0);
  const totalIncome = income.reduce((sum, row) => sum + incomeAmount(row), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + expenseAmount(row), 0);
  const feedExpenses = expenses
    .filter((row) => isCategory(row.category, "Feed"))
    .reduce((sum, row) => sum + expenseAmount(row), 0);
  const fingerlingExpenses = expenses
    .filter((row) => isCategory(row.category, "Fingerlings"))
    .reduce((sum, row) => sum + expenseAmount(row), 0);
  const medicineExpenses = expenses
    .filter((row) => isCategory(row.category, "Medicine"))
    .reduce((sum, row) => sum + expenseAmount(row), 0);

  return {
    harvestedKg,
    soldKg,
    feedKg,
    inventoryFeedUsageKg,
    totalIncome,
    totalExpenses,
    feedExpenses,
    fingerlingExpenses,
    medicineExpenses,
    revenuePerKg: soldKg > 0 ? totalIncome / soldKg : 0,
    expensePerHarvestKg: harvestedKg > 0 ? totalExpenses / harvestedKg : 0,
    feedCostPerKgFed: feedKg > 0 ? feedExpenses / feedKg : 0,
    estimatedGrossMargin: totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0,
    range,
  };
}
