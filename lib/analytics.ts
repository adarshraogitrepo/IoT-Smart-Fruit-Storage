export type SensorReading = {
  temperature: number
  humidity: number
  mq135: number
  fanStatus: boolean
  timestamp: number
}

/** Default thresholds — used by analytics functions. Runtime overrides come from ThresholdsContext. */
export const THRESHOLDS = {
  temperature: { warn: 26, critical: 30 },
  humidity: { warn: 75, critical: 80 },
  mq135: { warn: 450, critical: 600 },
}

export type Status = "safe" | "warn" | "danger"

export function statusFor(
  metric: keyof typeof THRESHOLDS,
  value: number,
  overrides?: typeof THRESHOLDS,
): Status {
  const t = (overrides ?? THRESHOLDS)[metric]
  if (value >= t.critical) return "danger"
  if (value >= t.warn) return "warn"
  return "safe"
}

export const STATUS_COLOR: Record<Status, string> = {
  safe: "var(--safe)",
  warn: "var(--warn)",
  danger: "var(--danger)",
}

/**
 * Storage Health Score (0-100).
 * Each metric contributes a sub-score based on distance from its ideal band.
 */
export function healthScore(r: SensorReading): number {
  const tempScore = scoreBand(r.temperature, 2, 8, 0, 30)
  const humScore = scoreBand(r.humidity, 55, 70, 30, 95)
  const airScore = scoreLower(r.mq135, 200, 700)
  const score = tempScore * 0.4 + humScore * 0.3 + airScore * 0.3
  return Math.round(Math.max(0, Math.min(100, score)))
}

function scoreBand(v: number, lo: number, hi: number, min: number, max: number) {
  if (v >= lo && v <= hi) return 100
  if (v < lo) return clamp01((v - min) / (lo - min)) * 100
  return clamp01((max - v) / (max - hi)) * 100
}

function scoreLower(v: number, good: number, bad: number) {
  if (v <= good) return 100
  if (v >= bad) return 0
  return ((bad - v) / (bad - good)) * 100
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function healthLabel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Fair"
  if (score >= 30) return "Poor"
  return "Critical"
}

export type RipenessStage =
  | "Fresh"
  | "Moderately Ripe"
  | "Highly Ripe"
  | "Spoilage Risk"

export type FreshnessPrediction = {
  stage: RipenessStage
  shelfLifeDays: number
  spoilageProbability: number
}

/**
 * Heuristic freshness model based on temperature, humidity and gas (MQ135).
 * Higher temperature, humidity and gas accelerate ripening / spoilage.
 */
export function predictFreshness(r: SensorReading): FreshnessPrediction {
  const tempStress = clamp01((r.temperature - 4) / 28)
  const humStress = clamp01((r.humidity - 60) / 30)
  const gasStress = clamp01((r.mq135 - 200) / 500)
  const stress = tempStress * 0.4 + humStress * 0.25 + gasStress * 0.35

  const baseShelf = 9 // days under ideal conditions
  const shelfLifeDays = Math.max(0.2, baseShelf * (1 - stress))
  const spoilageProbability = Math.round(stress * 100)

  let stage: RipenessStage
  if (stress < 0.3) stage = "Fresh"
  else if (stress < 0.55) stage = "Moderately Ripe"
  else if (stress < 0.78) stage = "Highly Ripe"
  else stage = "Spoilage Risk"

  return {
    stage,
    shelfLifeDays: Math.round(shelfLifeDays * 10) / 10,
    spoilageProbability,
  }
}

export function isSpoilageRisk(r: SensorReading, overrides?: typeof THRESHOLDS): boolean {
  const t = overrides ?? THRESHOLDS
  return (
    r.temperature > t.temperature.critical ||
    r.humidity > t.humidity.critical ||
    r.mq135 > t.mq135.critical
  )
}

export type Insight = {
  id: string
  tone: "info" | "warn" | "danger" | "good"
  message: string
}

export function buildInsights(
  current: SensorReading,
  history: SensorReading[],
): Insight[] {
  const insights: Insight[] = []
  const prev = history.length > 12 ? history[history.length - 13] : history[0]

  if (prev) {
    const delta = ((current.temperature - prev.temperature) / (prev.temperature || 1)) * 100
    if (Math.abs(delta) >= 5) {
      insights.push({
        id: "temp-trend",
        tone: delta > 0 ? "warn" : "good",
        message: `Temperature has ${delta > 0 ? "increased" : "decreased"} ${Math.abs(
          delta,
        ).toFixed(0)}% over the recent window.`,
      })
    }
  }

  const f = predictFreshness(current)
  if (f.stage === "Spoilage Risk" || f.spoilageProbability > 70) {
    insights.push({
      id: "shelf",
      tone: "danger",
      message: "Shelf life is decreasing faster than expected. Recommend activating cooling.",
    })
  } else if (f.stage === "Fresh") {
    insights.push({
      id: "favorable",
      tone: "good",
      message: "Current conditions are favorable for long-term storage.",
    })
  }

  if (statusFor("humidity", current.humidity) !== "safe") {
    insights.push({
      id: "humidity",
      tone: "warn",
      message: "Humidity is outside the optimal band — condensation may accelerate mold.",
    })
  }
  if (statusFor("mq135", current.mq135) !== "safe") {
    insights.push({
      id: "air",
      tone: "warn",
      message: "Air quality is deteriorating — ethylene / VOC buildup detected.",
    })
  }
  if (insights.length === 0) {
    insights.push({
      id: "stable",
      tone: "good",
      message: "All parameters are stable and within safe operating ranges.",
    })
  }
  return insights
}

/** Simple linear forecast for the next N steps. */
export function forecast(history: number[], steps: number): number[] {
  const n = history.length
  if (n < 2) return Array(steps).fill(history[n - 1] ?? 0)
  const recent = history.slice(-12)
  const m = recent.length
  const xs = recent.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / m
  const meanY = recent.reduce((a, b) => a + b, 0) / m
  let num = 0
  let den = 0
  for (let i = 0; i < m; i++) {
    num += (xs[i] - meanX) * (recent[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = meanY - slope * meanX
  return Array.from({ length: steps }, (_, i) => slope * (m + i) + intercept)
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
