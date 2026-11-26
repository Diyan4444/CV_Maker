import React from 'react';
import { notFound } from 'next/navigation';
import { BackgroundGalleryClient } from './BackgroundGalleryClient';

export default function DevBackgroundPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <BackgroundGalleryClient />;
}
