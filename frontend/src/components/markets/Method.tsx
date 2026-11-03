import type { ReactNode } from 'react';

/** How a board is built, one click away rather than a paragraph in front of the results. */
export function Method({ children }: { children: ReactNode }) {
  return (
    <details className="text-body-sm text-fg-2">
      <summary className="w-fit cursor-pointer py-2.5 hover:text-fg">How this works</summary>
      <div className="flex max-w-prose flex-col gap-2 pb-2">{children}</div>
    </details>
  );
}
