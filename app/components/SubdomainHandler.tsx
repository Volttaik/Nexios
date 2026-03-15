'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SubdomainHandlerProps {
  children: React.ReactNode;
}

export default function SubdomainHandler({ children }: SubdomainHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get hostname from window
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check if there's a subdomain (more than 2 parts for domain.com or 3 for www.domain.com)
    let detectedSubdomain = null;
    if (parts.length > 2) {
      // Handle cases like app.localhost or app.example.com
      detectedSubdomain = parts[0];
    }
    
    setSubdomain(detectedSubdomain);
    
    // If we're on a subdomain and not already on a dashboard path, redirect
    if (detectedSubdomain && !pathname.startsWith('/dashboard')) {
      router.push(`/dashboard${pathname === '/' ? '' : pathname}`);
    }
  }, [pathname, router]);

  // Pass subdomain to children via context or props
  if (!mounted) return null;

  return (
    <>
      {children}
    </>
  );
}

// Hook to use subdomain in components
export function useSubdomain() {
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      if (parts.length > 2) {
        setSubdomain(parts[0]);
      } else {
        setSubdomain(null);
      }
    }
  }, []);

  return subdomain;
}
