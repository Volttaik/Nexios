'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'black' | 'white' | 'gray';
}

export default function LoadingSpinner({ size = 'md', color = 'black' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    black: 'border-black',
    white: 'border-white',
    gray: 'border-gray-500'
  };

  const borderColor = {
    black: 'border-t-black',
    white: 'border-t-white',
    gray: 'border-t-gray-500'
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} border-2 ${colorClasses[color]} ${borderColor[color]} border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
