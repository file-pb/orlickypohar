/** Formátování čísel a časů, která se na obrazovkách trackeru opakují. */

export function trvani(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

export function vzdalenost(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/** Na vodě se mluví v uzlech, ne v metrech za sekundu. */
export function rychlost(ms: number | null): string {
  if (ms == null) return '—';
  return `${(ms * 1.943844).toFixed(1)} kt`;
}

export function casAMinuty(ms: number | null): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
