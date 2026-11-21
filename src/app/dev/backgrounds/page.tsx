import { notFound } from 'next/navigation';
import { DevBackgroundsGallery } from './DevBackgroundsGallery';

export const metadata = {
  title: 'ColorField Gallery (Dev Only)',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevBackgroundsPage() {
  // DEV-ONLY: Must return 404 in production builds with no env override
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DevBackgroundsGallery />;
}
