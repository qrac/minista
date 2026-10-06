export function formatDesc(text: string, maxLength: number = 160): string {
  if (!text) return ""

  const normalized = text.replace(/\s+/g, " ").trim()
  const chars = Array.from(normalized)

  if (chars.length <= maxLength) {
    return normalized
  }
  return chars.slice(0, maxLength).join("") + "…"
}
