import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export interface BackgroundVideoProps {
  /** Video source served from /public. Defaults to the ShopeSync VSL. */
  src?: string;
  /** Extra class names forwarded to the fixed container. */
  className?: string;
  /** Extra class names forwarded to the dark scrim overlay. */
  overlayClassName?: string;
  /**
   * Opacity (0–1) of the dark scrim drawn over the video so foreground
   * text/CTAs stay legible. Kept subtle by default.
   */
  overlayOpacity?: number;
  /**
   * Solid fallback color painted on the container. Prevents any white flash
   * while the video loads and remains visible if the video fails. Matches the
   * /planos dark theme by default.
   */
  posterColor?: string;
}

/**
 * Full-bleed, decorative looping background video.
 *
 * - Sits BEHIND page content (zIndex 0) and never intercepts pointer events.
 * - Autoplays muted + inline for cross-browser / mobile autoplay.
 * - Degrades gracefully: on load/playback error the video is hidden and the
 *   solid posterColor background remains, so the page keeps working.
 */
export function BackgroundVideo({
  src = "/videos/shopesync-vsl.mp4",
  className,
  overlayClassName,
  overlayOpacity = 0.55,
  posterColor = "#080808",
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Belt-and-suspenders: ensure muted before attempting autoplay so mobile
    // browsers don't block it. Some engines ignore the `muted` attribute on
    // the initial render, so set it imperatively too.
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay rejection is non-fatal — the poster color stays visible.
      });
    }
  }, []);

  const containerStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: posterColor,
    pointerEvents: "none",
    zIndex: 0,
  };

  const videoStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    pointerEvents: "none",
    display: failed ? "none" : "block",
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, rgba(8,8,8,${overlayOpacity}) 0%, rgba(8,8,8,${Math.min(
      overlayOpacity + 0.1,
      1,
    )}) 100%)`,
  };

  return (
    <div className={className} style={containerStyle} aria-hidden="true">
      {!failed && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
          style={videoStyle}
        />
      )}
      <div className={overlayClassName} style={overlayStyle} />
    </div>
  );
}

export default BackgroundVideo;
