"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, MousePointerClick } from "lucide-react";

interface SitePreviewProps {
  projectName: string;
  url: string;
  scrollable?: boolean;
  className?: string;
}

const IFRAME_W = 1280;
const IFRAME_H = 720;

export function SitePreview({ projectName, url, scrollable = false, className }: SitePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [useFallback, setUseFallback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setScale(width / IFRAME_W);
      setIsMobile(width < 500);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // On mobile cards, always use thumbnail for performance
  const showThumbnail = useFallback || (isMobile && !scrollable);

  // For scrollable (detail) mode, require click to interact
  const allowInteraction = scrollable && interacting;

  // For cards: cap preview height so it doesn't dominate the card
  const maxCardHeight = isMobile ? 200 : 240;
  const scaledHeight = scrollable ? undefined : Math.min(Math.round(IFRAME_H * scale), maxCardHeight);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-zinc-900 ${className ?? ""}`}
      style={scaledHeight ? { height: scaledHeight } : undefined}
    >
      {showThumbnail ? (
        /* PNG thumbnail fallback */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/thumbnails/${projectName}.png`}
          alt={`Preview of ${projectName}`}
          className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500"
          onError={() => {
            /* both failed — show nothing */
          }}
        />
      ) : (
        <>
          <iframe
            src={url}
            title={`Preview of ${projectName}`}
            scrolling="no"
            style={{
              width: IFRAME_W,
              height: scrollable ? "100%" : IFRAME_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: allowInteraction ? "auto" : "none",
              border: "none",
              overflow: "hidden",
            }}
            onError={() => setUseFallback(true)}
          />

          {/* Click to interact overlay for scrollable mode */}
          {scrollable && !interacting && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setInteracting(true);
              }}
              className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/interact"
            >
              <div className="flex items-center gap-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 px-4 py-2.5 backdrop-blur-sm opacity-0 group-hover/interact:opacity-100 transition-opacity">
                <MousePointerClick className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[12px] font-medium text-zinc-400">Click to interact</span>
              </div>
            </div>
          )}

          {/* Click outside to stop interacting */}
          {scrollable && interacting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInteracting(false);
              }}
              className="absolute top-3 right-14 z-20 flex h-9 items-center justify-center rounded-xl bg-black/60 border border-white/10 px-3 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-black/80 backdrop-blur-md transition-all"
            >
              Stop interacting
            </button>
          )}
        </>
      )}

      {/* Fade-out gradient at the bottom */}
      {!allowInteraction && (
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/90 to-transparent" />
      )}

      {/* Toggle button — bottom-right corner */}
      {!scrollable && (
        <button
          title={useFallback ? "Show live preview" : "Show screenshot"}
          onClick={(e) => {
            e.stopPropagation();
            setUseFallback((v) => !v);
          }}
          className="absolute bottom-2 right-2 z-10 rounded-md bg-zinc-900/70 p-1 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-300"
        >
          <Globe className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
