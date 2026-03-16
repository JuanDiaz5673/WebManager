"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";

interface SitePreviewProps {
  projectName: string;
  url: string;
  scrollable?: boolean;
  className?: string;
}

export function SitePreview({ projectName, url, scrollable = false, className = "aspect-[16/9]" }: SitePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [useFallback, setUseFallback] = useState(false);
  const hostname = new URL(url).hostname;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1280);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-zinc-900 ${className}`}
    >
      {useFallback ? (
        /* PNG thumbnail fallback (also used if no iframe embeds) */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/thumbnails/${projectName}.png`}
          alt={`Preview of ${projectName}`}
          className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500"
          onError={() => {
            /* both failed — show globe */
          }}
        />
      ) : (
        <iframe
          src={url}
          title={`Preview of ${projectName}`}
          style={{
            width: 1300,
            height: scrollable ? "100%" : 768,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: scrollable ? "auto" : "none",
            border: "none",
          }}
          onError={() => setUseFallback(true)}
        />
      )}

      {/* Fade-out gradient at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950/90 to-transparent" />

      {/* Toggle button — bottom-right corner */}
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
    </div>
  );
}
