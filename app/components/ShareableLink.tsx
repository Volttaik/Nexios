'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { createAuthUrl } from '../lib/tokenUtils';

interface ShareableLinkProps {
  path: string;
  label?: string;
}

export default function ShareableLink({ path, label = 'Share' }: ShareableLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const url = createAuthUrl(path, token);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faLink} className="w-3 h-3" />
      <span>{copied ? 'Copied!' : label}</span>
      {!copied && <FontAwesomeIcon icon={faCopy} className="w-3 h-3 opacity-50" />}
    </button>
  );
}
