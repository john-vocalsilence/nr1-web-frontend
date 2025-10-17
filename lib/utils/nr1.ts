export const LIKERT_EMOJI = ["😠", "🙁", "😐", "🙂", "😄"] as const

export function normalizeOptions(options: string[] | string | undefined): string[] {
  if (!options) return []
  if (Array.isArray(options)) return options
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {}
    return options
      .split(/\r?\n|\|/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}