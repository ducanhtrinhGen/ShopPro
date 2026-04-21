import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { GlitchText } from "./GlitchText";
import { useLazyVideo } from "../../hooks/useLazyVideo";
import { useIsLowEndDevice } from "../../hooks/useIsLowEndDevice";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/* -------------------------------------------------------------------------- *
 *  Corsair-style fixed video hero                                            *
 *                                                                            *
 *  One looping background video, pinned over a full viewport, with a         *
 *  centered editorial content block. This replaces the old multi-scene      *
 *  scroll-driven hero with the simpler "one image, always playing" vibe     *
 *  from corsair.com / razer.com / nzxt.com.                                  *
 * -------------------------------------------------------------------------- */

type HeroProps = {
  /** Main title (big, bold). Defaults to a VN-gaming line. */
  title?: string;
  /** Short kicker above the title. */
  eyebrow?: string;
  /** Supporting sentence below the title. */
  subtitle?: string;
  /** CTA label + href. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Video sources. Keep MP4 under ~8 MB, WebM optional. */
  videoMp4?: string;
  videoWebm?: string;
  /** Poster image — also used as the low-end / reduced-motion fallback. */
  poster?: string;
  /** Render glitch effect on the title (disabled for reduced-motion). */
  glitch?: boolean;
};

const DEFAULTS = {
  title: "Linh kiện PC cao cấp",
  eyebrow: "HIỆU NĂNG THẾ HỆ MỚI",
  subtitle:
    "Nâng tầm trải nghiệm chơi game, làm việc và sáng tạo với hệ sinh thái linh kiện hiệu năng cao, thiết kế gọn gàng và khả năng nâng cấp linh hoạt.",
  ctaLabel: "Mua ngay",
  ctaHref: "/products",
  videoMp4: "/videos/hero.mp4",
  videoWebm: "/videos/hero.webm",
  poster:
    "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1920&q=80",
  glitch: true
} as const;

/* -------------------------------------------------------------------------- */
/*  CTA button (hover shimmer + arrow shift)                                  */
/* -------------------------------------------------------------------------- */

function HeroCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      className="group relative mt-10 inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-white/5 px-8 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md transition-colors hover:border-white/80"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
      />
      <span className="relative">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
      >
        <path d="M5 12h14" />
        <path d="m13 5 7 7-7 7" />
      </svg>
    </motion.a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Hero                                                                 */
/* -------------------------------------------------------------------------- */

export function Hero(props: HeroProps = {}) {
  const {
    title = DEFAULTS.title,
    eyebrow = DEFAULTS.eyebrow,
    subtitle = DEFAULTS.subtitle,
    ctaLabel = DEFAULTS.ctaLabel,
    ctaHref = DEFAULTS.ctaHref,
    videoMp4 = DEFAULTS.videoMp4,
    videoWebm = DEFAULTS.videoWebm,
    poster = DEFAULTS.poster,
    glitch: glitchProp = DEFAULTS.glitch
  } = props;

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  const lowEnd = useIsLowEndDevice();
  const staticMode = reducedMotion || lowEnd;

  // Subtle scroll-driven parallax: the video slowly scales and drifts while
  // content fades as the user leaves the hero behind.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, 0]);
  const videoDim = useTransform(scrollYProgress, [0, 1], [1, 0.55]);

  // Lazy mount the <source> elements once the hero is near the viewport.
  // It's above the fold so in practice this fires almost immediately, but
  // keeping the guard means SSR / pre-rendered markup doesn't fetch video
  // bytes until hydration has happened.
  const { ref: lazyRef, shouldLoad } = useLazyVideo<HTMLDivElement>("50% 0px");

  // Some browsers suspend autoplay when the tab backgrounds; kick playback
  // when visibility returns. Ignore rejections (autoplay can be blocked when
  // the video isn't muted, but we always mute below).
  useEffect(() => {
    if (staticMode) return;
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [staticMode, shouldLoad]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate h-[100svh] min-h-[620px] w-full overflow-hidden bg-abyss text-white"
      aria-label="Hero"
    >
      {/* ---------- Background media ---------- */}
      <motion.div
        ref={lazyRef}
        className="absolute inset-0"
        style={
          staticMode
            ? undefined
            : {
                scale: videoScale,
                y: videoY,
                opacity: videoDim,
                willChange: "transform, opacity"
              }
        }
        aria-hidden="true"
      >
        {staticMode ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload={shouldLoad ? "auto" : "none"}
            disablePictureInPicture
            disableRemotePlayback
          >
            {shouldLoad && videoWebm ? <source src={videoWebm} type="video/webm" /> : null}
            {shouldLoad ? <source src={videoMp4} type="video/mp4" /> : null}
          </video>
        )}
      </motion.div>

      {/* ---------- Cinematic overlay (readable text regardless of video) ---------- */}
      <div className="hero-overlay pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* ---------- Foreground content ---------- */}
      <motion.div
        className="relative z-10 flex h-full items-center justify-center px-6 text-center"
        style={staticMode ? undefined : { y: contentY, opacity: contentOpacity, willChange: "transform, opacity" }}
      >
        <div className="max-w-3xl">
          <motion.p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-neon-cyan md:text-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl md:text-8xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <GlitchText active={glitchProp && !reducedMotion}>{title}</GlitchText>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-base text-white/80 md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          >
            <HeroCTA href={ctaHref}>{ctaLabel}</HeroCTA>
          </motion.div>
        </div>
      </motion.div>

      {/* ---------- Scroll indicator ---------- */}
      {!staticMode ? (
        <motion.div
          className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.4em]">
            <span>Scroll</span>
            <motion.span
              className="block h-8 w-px bg-white/60"
              animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}
