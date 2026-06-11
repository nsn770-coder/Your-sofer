'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface Props {
  imgSrc: string;
  alt: string;
  videoUrl?: string;
  children?: React.ReactNode; // badge / overlays
}

// Renders the 155px media area of a product card.
// If videoUrl is set and the card is visible for >1s, the video auto-plays.
// When the card leaves the viewport the video pauses and resets.
export default function ProductCardVideo({ imgSrc, alt, videoUrl, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);

  const startPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {}); // swallow autoplay-policy rejections
    setPlaying(true);
  }, []);

  const stopPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!videoUrl) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Wait 1 s of continuous visibility before playing
          timerRef.current = setTimeout(startPlay, 1000);
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          stopPlay();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [videoUrl, startPlay, stopPlay]);

  return (
    <div ref={containerRef} style={{ height: 155, overflow: 'hidden', position: 'relative' }}>

      {/* ── Image layer — fades out when video plays ── */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: playing ? 0 : 1,
        transition: 'opacity 0.35s',
        pointerEvents: playing ? 'none' : 'auto',
      }}>
        {imgSrc ? (
          <Image
            fill unoptimized loading="lazy"
            src={imgSrc} alt={alt}
            style={{ objectFit: 'cover' }}
            sizes="160px"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, color: '#ccc' }}>📦</span>
          </div>
        )}
      </div>

      {/* ── Video layer — rendered only when videoUrl exists, fades in on play ── */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          loop
          preload="none"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: playing ? 1 : 0,
            transition: 'opacity 0.35s',
          }}
        />
      )}

      {/* ── Badge / overlay slot (e.g. "הכי נמכר") ── */}
      {children}
    </div>
  );
}
