'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      router.push('/calendar');
    }
  }, [status, router]);

  return (
    <div className="loading-spinner" style={{ minHeight: '100vh' }}>
      <div className="spinner"></div>
    </div>
  );
}
