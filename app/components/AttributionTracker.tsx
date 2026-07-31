'use client';
import { useEffect } from 'react';
import { captureAttributionFromUrl } from '@/lib/attribution';

export default function AttributionTracker() {
  useEffect(() => {
    captureAttributionFromUrl();
  }, []);
  return null;
}
