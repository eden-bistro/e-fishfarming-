export type WaterQualityStatus = "safe" | "warning" | "critical" | "unavailable";

export type WaterQualityAssessment = {
  status: WaterQualityStatus;
  canFeed: boolean;
  label: string;
  message: string;
  issues: Array<{ metric: string; severity: "warning" | "critical"; message: string }>;
};

export type WaterQualityInput = {
  timestamp: string;
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  ammonia: number;
  nitrite: number;
  turbidity: number;
};

export const WATER_QUALITY_LIMITS = {
  temperatureWarningAboveC: 31,
  temperatureCriticalAboveC: 33,
  phMinimum: 6.5,
  phMaximum: 8.5,
  dissolvedOxygenWarningBelowMgL: 5,
  dissolvedOxygenCriticalBelowMgL: 4,
  ammoniaWarningAboveMgL: 0.05,
  ammoniaCriticalAboveMgL: 0.1,
  maximumReadingAgeMs: 5 * 60 * 1000,
} as const;

export function assessWaterQuality(
  reading: WaterQualityInput | null | undefined,
  now = Date.now(),
): WaterQualityAssessment {
  const unavailable = (message: string): WaterQualityAssessment => ({
    status: "unavailable",
    canFeed: false,
    label: "Data unavailable",
    message,
    issues: [],
  });

  if (!reading) {
    return unavailable("No verified online water-quality reading is available.");
  }

  const values = [
    reading.temperature,
    reading.ph,
    reading.dissolvedOxygen,
    reading.ammonia,
    reading.nitrite,
    reading.turbidity,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    reading.ph < 0 ||
    reading.ph > 14 ||
    reading.temperature < -5 ||
    reading.temperature > 60 ||
    [reading.dissolvedOxygen, reading.ammonia, reading.nitrite, reading.turbidity].some(
      (value) => value < 0,
    )
  ) {
    return unavailable("The latest sensor reading contains invalid or out-of-range values.");
  }

  const timestamp = Date.parse(reading.timestamp);
  if (!Number.isFinite(timestamp)) {
    return unavailable("The sensor reading has no valid timestamp.");
  }
  const age = now - timestamp;
  if (age < -60_000) {
    return unavailable("The sensor timestamp is in the future; verify the device clock.");
  }
  if (age > WATER_QUALITY_LIMITS.maximumReadingAgeMs) {
    return unavailable("The latest sensor reading is older than five minutes. Check device connectivity.");
  }

  const issues: WaterQualityAssessment["issues"] = [];
  if (reading.dissolvedOxygen < WATER_QUALITY_LIMITS.dissolvedOxygenWarningBelowMgL) {
    const critical = reading.dissolvedOxygen < WATER_QUALITY_LIMITS.dissolvedOxygenCriticalBelowMgL;
    issues.push({
      metric: "dissolved oxygen",
      severity: critical ? "critical" : "warning",
      message: `Dissolved oxygen is low (${reading.dissolvedOxygen} mg/L).`,
    });
  }
  if (reading.ammonia > WATER_QUALITY_LIMITS.ammoniaWarningAboveMgL) {
    const critical = reading.ammonia > WATER_QUALITY_LIMITS.ammoniaCriticalAboveMgL;
    issues.push({
      metric: "ammonia",
      severity: critical ? "critical" : "warning",
      message: `Ammonia is above the limit (${reading.ammonia} mg/L).`,
    });
  }
  if (reading.temperature > WATER_QUALITY_LIMITS.temperatureWarningAboveC) {
    const critical = reading.temperature > WATER_QUALITY_LIMITS.temperatureCriticalAboveC;
    issues.push({
      metric: "temperature",
      severity: critical ? "critical" : "warning",
      message: `Water temperature is high (${reading.temperature} °C).`,
    });
  }
  if (reading.ph < WATER_QUALITY_LIMITS.phMinimum || reading.ph > WATER_QUALITY_LIMITS.phMaximum) {
    issues.push({
      metric: "pH",
      severity: "warning",
      message: `pH is outside the ${WATER_QUALITY_LIMITS.phMinimum}–${WATER_QUALITY_LIMITS.phMaximum} range (${reading.ph}).`,
    });
  }

  if (issues.length === 0) {
    return {
      status: "safe",
      canFeed: true,
      label: "Within configured limits",
      message: "All monitored parameters are within the current platform limits.",
      issues,
    };
  }

  const critical = issues.some((issue) => issue.severity === "critical");
  return {
    status: critical ? "critical" : "warning",
    canFeed: false,
    label: critical ? "Critical water-quality condition" : "Water quality requires attention",
    message: issues.map((issue) => issue.message).join(" "),
    issues,
  };
}
