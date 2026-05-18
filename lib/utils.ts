export function shortId(id: string): string {
  return id ? id.slice(0, 13) + "…" : "—";
}

export function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function formatAmount(n: number): string {
  return n.toFixed(2);
}
