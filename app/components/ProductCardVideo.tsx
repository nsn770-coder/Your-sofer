'use client';
import { useRef, useEffect } from 'react';
import Image from 'next/image';

interface Props {
  imgSrc: string;
  alt: string;
  videoUrl?: string;
  index?: number;
  preloadTrigger?: boolean; // for index 0,1 — fires when section IO triggers
  children?: React.ReactNode;
  /** Responsive sizes hint for the image layer (matches category-grid card widths by default) */
  sizes?: string;
}

function injectCloudinaryParams(url: string): string {
  if (!url || url.includes('f_auto')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

export default function ProductCardVideo({
  imgSrc, alt, videoUrl, index = 0, preloadTrigger = false, children,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const imgLayerRef  = useRef<HTMLDivElement>(null);
  const playedRef    = useRef(false); // gates initial load() only, not play/pause

  const optimizedUrl = videoUrl ? injectCloudinaryParams(videoUrl) : undefined;
  const isEager      = index < 2;

  // Eager videos (index 0,1): load+play when section IO fires, then pause/resume on visibility
  useEffect(() => {
    if (!isEager || !preloadTrigger || !optimizedUrl) return;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || playedRef.current) return;
    playedRef.current = true;
    video.preload = 'auto';
    video.load();
    video.play().catch(() => {});
    video.addEventListener('playing', () => {
      video.style.opacity = '1';
      if (imgLayerRef.current) imgLayerRef.current.style.opacity = '0';
    }, { once: true });

    // Pause when scrolled off-screen, resume when back in view
    const obs = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!v) return;
        if (entry.isIntersecting) { v.play().catch(() => {}); }
        else { v.pause(); }
      },
      { threshold: 0.1 },
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, [isEager, preloadTrigger, optimizedUrl]);

  // Lazy videos (index >= 2): load+play on first enter, pause on exit, resume on re-enter
  useEffect(() => {
    if (isEager || !optimizedUrl) return;
    const container = containerRef.current;
    if (!container) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          if (!playedRef.current) {
            playedRef.current = true;
            video.load();
            video.play().catch(() => {});
            video.addEventListener('playing', () => {
              video.style.opacity = '1';
              if (imgLayerRef.current) imgLayerRef.current.style.opacity = '0';
            }, { once: true });
          } else {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { rootMargin: '400px 0px', threshold: 0 },
    );

    obs.observe(container);
    return () => obs.disconnect();
  }, [isEager, optimizedUrl]);

  return (
    // Square media area — same aspect ratio as category ProductCard (1:1);
    // explicit aspect-ratio reserves space up-front so there is no CLS.
    <div ref={containerRef} style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', position: 'relative', background: '#FFFFFF' }}>

      {/* Image layer — visible by default, fades out when video starts playing */}
      <div ref={imgLayerRef} style={{ position: 'absolute', inset: 0, transition: 'opacity 0.35s' }}>
        {imgSrc ? (
          <Image
            fill unoptimized loading="lazy"
            src={imgSrc} alt={alt}
            style={{ objectFit: 'cover' }}
            sizes={sizes}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, color: '#ccc' }}>📦</span>
          </div>
        )}
      </div>

      {/* Video layer — hidden until playing, fades in on play */}
      {optimizedUrl && (
        <video
          ref={videoRef}
          src={optimizedUrl}
          muted
          playsInline
          loop
          preload="none"
          poster={imgSrc}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0,
            transition: 'opacity 0.35s',
          }}
        />
      )}

      {/* Badge / overlay slot */}
      {children}
    </div>
  );
}
