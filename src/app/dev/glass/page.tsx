import React from 'react';
import { notFound } from 'next/navigation';
import { GlassGalleryClient } from './GlassGalleryClient';

export default function DevGlassPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <GlassGalleryClient />;
}
