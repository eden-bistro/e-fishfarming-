import { listProductionEvents, type ProductionEvent } from "@/services/modules/production.service";

export type ProductionIntelligence = {
  totalStocked: number;
  totalMortality: number;
  survivalRate: number;
  totalFeedKg: number;
  totalHarvestKg: number;
  currentBiomassKg: number;
  overallFcr: number;
  avgDailyGrowthKg: number;
  projectedHarvestDate: string | null;
  projectedHarvestKg30d: number;
};

const DAY = 24 * 60 * 60 * 1000;

function sumByType(
  events: ProductionEvent[],
  type: ProductionEvent["type"],
  field: "fishCount" | "weightKg" | "feedKg",
) {
  return events
    .filter((event) => event.type === type)
    .reduce((sum, event) => sum + Number(event[field] ?? 0), 0);
}

export function buildProductionIntelligence(
  events = listProductionEvents(),
): ProductionIntelligence {
  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const totalStocked = sumByType(sorted, "stocking", "fishCount");
  const totalMortality = sumByType(sorted, "mortality", "fishCount");
  const totalFeedKg = sumByType(sorted, "feeding", "feedKg");
  const totalHarvestKg = sumByType(sorted, "harvest", "weightKg");

  const survivalRate =
    totalStocked > 0 ? ((totalStocked - totalMortality) / totalStocked) * 100 : 0;
  const overallFcr = totalFeedKg / Math.max(totalHarvestKg, 1);

  const netFish = Math.max(totalStocked - totalMortality, 0);
  const assumedAverageWeightKg = netFish > 0 ? totalHarvestKg / Math.max(netFish, 1) : 0;
  const currentBiomassKg = Math.max(totalHarvestKg, netFish * assumedAverageWeightKg);

  const first = sorted[0]?.createdAt ? new Date(sorted[0].createdAt).getTime() : null;
  const last = sorted.at(-1)?.createdAt ? new Date(sorted.at(-1)!.createdAt).getTime() : null;
  const elapsedDays = first && last ? Math.max((last - first) / DAY, 1) : 0;
  const avgDailyGrowthKg = elapsedDays > 0 ? totalHarvestKg / elapsedDays : 0;

  const projectedHarvestKg30d = currentBiomassKg + avgDailyGrowthKg * 30;

  const harvestTargetKg = 1200;
  const remainingKg = Math.max(harvestTargetKg - currentBiomassKg, 0);
  const daysToTarget = avgDailyGrowthKg > 0 ? Math.ceil(remainingKg / avgDailyGrowthKg) : null;
  const projectedHarvestDate =
    daysToTarget !== null
      ? new Date(Date.now() + daysToTarget * DAY).toISOString().slice(0, 10)
      : null;

  return {
    totalStocked,
    totalMortality,
    survivalRate,
    totalFeedKg,
    totalHarvestKg,
    currentBiomassKg,
    overallFcr,
    avgDailyGrowthKg,
    projectedHarvestDate,
    projectedHarvestKg30d,
  };
}
