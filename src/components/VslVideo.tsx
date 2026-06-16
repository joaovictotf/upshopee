import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export interface VslVideoProps {
  /** Video source served from /public. Defaults to the ShopeSync VSL. */
  src?: string;
  /** Extra class names forwarded to the centered card element. */
  className?: string;
  /** Max width (px) of the centered card on desktop. Defaults to 900. */
  maxWidth?: number;
  /**
   * Solid fallback color painted on the card. Prevents any blank flash while
   * the ~13MB video loads and stays visible if the video fails to load.
   * Matches the /planos dark theme by default.
   */
  posterColor?: string;
}

/**
 * Self-contained, VSL-style video card.
 *
 * - Renders its own <section> (dark background, vertical padding, horizontal
 *   page padding) with a centered, responsive 16:9 card so a page can drop in
 *   `<VslVideo />` on one line.
 * - Autoplays muted + inline (muted is intended) for cross-browser / mobile.
 * - Degrades gracefully: on load/playback error the video is hidden and the
 *   solid posterColor background remains so the page keeps working.
 */
export function VslVideo({
  src = "/videos/shopesync-vsl.mp4",
  className,
  maxWidth = 900,
  posterColor = "#080808",
}: VslVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Ensure muted before attempting autoplay so mobile browsers don't block
    // it. Some engines ignore the `muted` attribute on the initial render, so
    // set it imperatively too.
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay rejection is non-fatal — the poster color stays visible.
      });
    }
  }, []);

  const sectionStyle: CSSProperties = {
    background: "#080808",
    padding: "40px 16px",
  };

  const cardStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth,
    margin: "0 auto",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid rgba(238,77,45,0.25)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    background: posterColor,
  };

  const videoStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: failed ? "none" : "block",
  };

  return (
    <section style={sectionStyle}>
      <div className={className} style={cardStyle}>
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
            tabIndex={-1}
            onError={() => setFailed(true)}
            style={videoStyle}
          />
        )}
      </div>
    </section>
  );
}

export default VslVideo;
