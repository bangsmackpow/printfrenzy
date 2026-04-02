"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ImageLightboxProps {
  images: string[];
  onClose: () => void;
}

export function ImageLightbox({ images, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, images.length]);

  const validImages = images.filter(img => img && img !== '/placeholder.svg');
  if (validImages.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="relative w-full aspect-square max-h-[75vh] bg-black rounded-2xl overflow-hidden">
          <Image
            src={validImages[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            fill
            className="object-contain"
            unoptimized
          />
        </div>

        {validImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 h-12 w-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-30"
              disabled={currentIndex === 0}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => setCurrentIndex(i => Math.min(i + 1, validImages.length - 1))}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 h-12 w-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-30"
              disabled={currentIndex === validImages.length - 1}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            <div className="flex gap-2 mt-4">
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-16 w-16 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentIndex ? 'border-blue-500 scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`Thumb ${idx + 1}`} width={64} height={64} className="object-cover w-full h-full" unoptimized />
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-white/50 text-xs font-bold mt-3">
          {currentIndex + 1} / {validImages.length}
        </p>
      </div>
    </div>
  );
}
