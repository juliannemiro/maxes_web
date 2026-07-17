"use client";

import { useEffect, useState } from "react";
import { CarruselHome } from "../../types";
import OptimizedImage from "../common/OptimizedImage";

interface CarruselProps {
  carruseles: CarruselHome[];
}

export default function Carrusel({ carruseles }: CarruselProps) {
  const slides =
    carruseles.length > 0
      ? carruseles.slice(0, 2).map((item) => ({
          src: item.imagen_url,
          alt: item.titulo || "Banner MAXES",
          href: item.link_destino,
        }))
      : [
          {
            src: "https://www.maxesinsumos.com/bannercat20241.jpg",
            alt: "Banner catalogo MAXES 1",
            href: null,
          },
          {
            src: "https://www.maxesinsumos.com/bannercat20242.jpg",
            alt: "Banner catalogo MAXES 2",
            href: null,
          },
        ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black shadow-sm ring-1 ring-black/10">
      <div className="relative aspect-[16/7] w-full sm:aspect-[16/6] lg:aspect-[16/5] xl:max-h-[46vh]">
        {slides.map((slide, slideIndex) => (
          <OptimizedImage
            key={`${slide.src}-${slideIndex}`}
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={slideIndex === 0}
            className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-700 ${
              slideIndex === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {slides[index]?.href && (
          <a
            href={slides[index].href}
            className="absolute inset-0 z-[1]"
            aria-label={slides[index].alt}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white transition-colors hover:bg-black/55 sm:left-4 sm:p-2"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setIndex((current) => (current + 1) % slides.length)}
        aria-label="Siguiente"
        className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white transition-colors hover:bg-black/55 sm:right-4 sm:p-2"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-2 sm:bottom-4">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            type="button"
            aria-label={`Ir al slide ${slideIndex + 1}`}
            onClick={() => setIndex(slideIndex)}
            className={`rounded-full transition-all ${
              slideIndex === index ? "h-2 w-6 bg-[var(--color-primary)]" : "h-2 w-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
