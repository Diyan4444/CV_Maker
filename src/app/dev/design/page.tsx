import React from 'react';
import { notFound } from 'next/navigation';
import { DesignGalleryClient } from './DesignGalleryClient';

export default function DevDesignPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <DesignGalleryClient />;
}
