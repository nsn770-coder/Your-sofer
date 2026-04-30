'use client';
import Clarity from '@microsoft/clarity';
import { useEffect } from 'react';

export default function ClarityInit() {
  useEffect(() => {
    Clarity.init('wiozsdfcgm');
  }, []);
  return null;
}
