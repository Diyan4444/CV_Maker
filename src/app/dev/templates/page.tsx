import React from 'react';
import { notFound } from 'next/navigation';
import { TemplatesGallery } from './TemplatesGallery';

export default function DevTemplatesPage() {
  if (process.env.NODE_ENV === 'production' && process.env.TEST_ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <TemplatesGallery />;
}
