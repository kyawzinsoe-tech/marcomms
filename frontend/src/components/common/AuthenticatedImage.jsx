import React, { useEffect, useState } from 'react';
import { getAuthToken } from '../../services/authService';

export function AuthenticatedImage({ src, alt, className, fallback = null }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let nextUrl = '';
    setFailed(false);
    setObjectUrl('');
    if (!src) return undefined;
    if (!String(src).startsWith('/api/')) {
      setObjectUrl(src);
      return undefined;
    }
    fetch(src, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Image unavailable');
        return response.blob();
      })
      .then((blob) => {
        nextUrl = URL.createObjectURL(blob);
        if (active) setObjectUrl(nextUrl);
      })
      .catch(() => active && setFailed(true));
    return () => { active = false; if (nextUrl) URL.revokeObjectURL(nextUrl); };
  }, [src]);

  if (failed || !objectUrl) return fallback;
  return <img className={className} src={objectUrl} alt={alt} referrerPolicy="no-referrer" />;
}
