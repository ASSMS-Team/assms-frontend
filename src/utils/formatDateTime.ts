// The API sends timestamps without a timezone offset ("2026-08-26T17:22:13"),
// which JavaScript reads as local time. They are displayed as-is rather than
// converted, so what is shown matches what the database holds.
export function formatDateTime(value: string): string {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
