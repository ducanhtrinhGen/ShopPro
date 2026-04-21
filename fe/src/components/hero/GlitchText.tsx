import { memo } from "react";

type GlitchTextProps = {
  children: string;
  /** When false, renders plain text (used for reduced-motion / low-end). */
  active?: boolean;
  className?: string;
};

/**
 * Cyberpunk-style chromatic-aberration title. The effect is 100% CSS
 * (see `.hero-glitch` in tailwind.css) - we only toggle it via a class name.
 */
function GlitchTextImpl({ children, active = true, className = "" }: GlitchTextProps) {
  if (!active) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className={`hero-glitch ${className}`} data-text={children} aria-label={children}>
      {children}
    </span>
  );
}

export const GlitchText = memo(GlitchTextImpl);
