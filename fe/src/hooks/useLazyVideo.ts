import { useEffect, useRef, useState } from "react";

/**
 * Lazy-mount a <video>'s <source> once the container enters the viewport
 * (or its expanded rootMargin zone). Prevents us from paying the network +
 * decode cost for offscreen videos.
 *
 * Usage:
 *   const { ref, shouldLoad } = useLazyVideo<HTMLDivElement>();
 *   return (
 *     <div ref={ref}>
 *       <video preload={shouldLoad ? "auto" : "none"}>
 *         {shouldLoad ? <source src="hero.mp4" type="video/mp4" /> : null}
 *       </video>
 *     </div>
 *   );
 */
export function useLazyVideo<T extends HTMLElement>(rootMargin = "200% 0px") {
  const ref = useRef<T | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldLoad]);

  return { ref, shouldLoad };
}
