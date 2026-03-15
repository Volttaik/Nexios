'use client';

import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  onClick?: () => void;
}

export default function LoadingSpinner({ onClick }: LoadingSpinnerProps) {
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleClick = () => {
    setIsNavigating(true);
    if (onClick) {
      startTransition(() => {
        onClick();
      });
    }
  };

  // Show spinner if navigation is pending or we're in a transition
  const showSpinner = isNavigating || isPending;

  if (!showSpinner) return null;

  return (
    <div 
      role="status" 
      aria-label="Loading" 
      className="inline-block w-3 h-3 ml-1"
    >
      <div 
        className="w-full h-full border-2 border-white border-t-transparent rounded-full"
        style={{
          animation: 'spin 0.6s linear infinite, fadeIn 0.2s ease-in'
        }}
      />
    </div>
  );
}
