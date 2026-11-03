/**
 * Loading indicator: the Polaris mark, its rings turning around the fixed
 * star. Redrawn from public/polaris-mark.png so each ring can move on its own;
 * currentColor so it reads on glass and on the white primary button.
 * Decorative: pair it with role="status" text. Reduced motion holds it still.
 */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  // Rings stay at least 1px wide when the mark is drawn small.
  const w = (design: number) => Math.max(design, 1024 / size);
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" stroke="currentColor"
         aria-hidden="true" focusable="false" className={className}>
      <path className="spinner-ring" strokeOpacity={0.6} strokeWidth={w(13)}
            d="M497.7 103.2A409 409 0 0 0 157.8 716.5M675.1 136.9A409 409 0 0 1 826.7 773.3" />
      <path className="spinner-ring spinner-ring--inner" strokeOpacity={0.8} strokeWidth={w(18)}
            d="M803 344A336 336 0 1 1 176.1 503.2" />
      <path className="spinner-ring spinner-ring--base" strokeOpacity={0.4} strokeWidth={w(8)}
            d="M257.3 911.8A474 474 0 0 0 748.3 922.9" />
      <path fill="currentColor" stroke="none" d="M512 233L534 490L672 512L534 534L512 695L490 534L353 512L490 490Z" />
    </svg>
  );
}
