/** Resolves a design token (a CSS custom property on :root, see globals.css)
 *  to its colour value. For canvas consumers (lightweight-charts, the drawing
 *  overlay) that can't take `var()`. Client-only: call it in effects/handlers. */
export function cssVar(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A resolved hex token at an opacity, for canvas consumers that can't take `color-mix`. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** A token at a given opacity, for DOM styles (`color-mix` takes `var()`). */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
