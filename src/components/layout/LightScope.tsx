import type { ReactNode } from "react";

/**
 * Forces light theme on wrapped content, regardless of global dark mode.
 * Used on protected pages (Dashboard, Metrics) that must always render in light theme.
 */
export function LightScope({ children }: { children: ReactNode }) {
  return (
    <div className="light-scope" data-theme="light">
      {children}
    </div>
  );
}
