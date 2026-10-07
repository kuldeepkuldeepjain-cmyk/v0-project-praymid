export type TimestampLike =
  | Date
  | string
  | number
  | { seconds?: unknown; nanoseconds?: unknown; _seconds?: unknown; _nanoseconds?: unknown; toMillis?: () => unknown }
  | null
  | undefined

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Returns Unix milliseconds for all timestamp shapes accepted from APIs and databases. */
export function normalizeTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime()

  if (value && typeof value === "object") {
    const timestamp = value as {
      toMillis?: () => unknown
      seconds?: unknown
      nanoseconds?: unknown
      _seconds?: unknown
      _nanoseconds?: unknown
    }
    if (typeof timestamp.toMillis === "function") {
      const millis = finiteNumber(timestamp.toMillis())
      if (millis !== null) return millis
    }

    const seconds = finiteNumber(timestamp.seconds ?? timestamp._seconds)
    const nanoseconds = finiteNumber(timestamp.nanoseconds ?? timestamp._nanoseconds) ?? 0
    if (seconds !== null) return seconds * 1000 + nanoseconds / 1_000_000
  }

  const numeric = finiteNumber(value)
  if (numeric !== null) {
    return Math.abs(numeric) < 100_000_000_000 ? numeric * 1000 : numeric
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return Number.NaN
}

export function timestampDebugValue(value: unknown) {
  return {
    normalizedMs: normalizeTimestamp(value),
    originalType: value === null ? "null" : typeof value,
    original: value,
  }
}
