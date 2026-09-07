export function n(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function pct(made: number, attempted: number) {
  if (!attempted) return "—";
  return `${((made / attempted) * 100).toFixed(1)}%`;
}

export function one(v: number) {
  return Number.isFinite(v) ? v.toFixed(1) : "0.0";
}

export function localDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric"
  }).format(new Date(iso));
}

export function localDateTime(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
}
