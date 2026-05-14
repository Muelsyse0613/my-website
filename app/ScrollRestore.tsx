'use client';

import { useEffect } from 'react';

export default function ScrollRestore() {
  useEffect(() => {
    const saved = sessionStorage.getItem('home_scroll_y');
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
        sessionStorage.removeItem('home_scroll_y');
      });
    }

    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem('home_scroll_y', String(window.scrollY));
      }, 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleBeforeUnload = () => {
      sessionStorage.setItem('home_scroll_y', String(window.scrollY));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
