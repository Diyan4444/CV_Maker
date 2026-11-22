import React from 'react';
import { notFound } from 'next/navigation';
import { LoadingGallery } from './LoadingGallery';

export default function DevLoadingPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <LoadingGallery />;
}
