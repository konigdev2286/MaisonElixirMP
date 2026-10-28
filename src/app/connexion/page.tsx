import { Suspense } from 'react';
import ConnexionContent from './ConnexionContent';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <ConnexionContent />
    </Suspense>
  );
}
