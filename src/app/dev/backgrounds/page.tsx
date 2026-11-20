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
  // DEV-ONLY: Must return 404 in production builds unless test-only runner flag is explicitly set
  if (process.env.NODE_ENV === 'production' && process.env.TEST_ALLOW_DEV_ROUTES !== 'true') {
    notFound();
  }

  return <DevBackgroundsGallery />;
}
