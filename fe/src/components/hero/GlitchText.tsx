import type { ReactNode } from "react";

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  return "";
}

export type GlitchTextProps = {
  active: boolean;
  children: ReactNode;
};

/**
 * Chromatic glitch on the title. CSS lives in `tailwind.css` (`.hero-glitch`).
 * When `active` is false, renders children unchanged (e.g. reduced motion).
 */
export function GlitchText({ active, children }: GlitchTextProps) {
  const raw = textFromChildren(children);
  if (!active || !raw) {
    return <>{children}</>;
  }

  return (
    <span className="hero-glitch" data-text={raw}>
      {children}
    </span>
  );
}
