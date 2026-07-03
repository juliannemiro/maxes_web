"use client";

import { useEffect, useState } from "react";
import { CarruselHome } from "../../types";

interface CarruselProps {
  carruseles: CarruselHome[];
}

export default function Carrusel({ carruseles }: CarruselProps) {
  const slides =
    carruseles.length > 0
      ? carruseles.slice(0, 2).map((item) => ({
          src: item.imagen_url,
          alt: item.titulo || "Banner MAXES",
          title: item.titulo,
          href: item.link_destino,
        }))
      : [
          {
            src: "https://www.maxesinsumos.com/bannercat20241.jpg",
            alt: "Banner catalogo MAXES 1",
            title: "Catalogo MAXES",
            href: null,
          },
          {
            src: "https://www.maxesinsumos.com/bannercat20242.jpg",
            alt: "Banner catalogo MAXES 2",
            title: "Novedades MAXES",
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

  const activeSlide = slides[index];

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] bg-[var(--color-header)]">
      <div className="relative aspect-square w-full md:aspect-[16/9] xl:aspect-[18/9] xl:max-h-[52vh]">
        {slides.map((slide, slideIndex) => (
          <img
            key={`${slide.src}-${slideIndex}`}
            src={slide.src}
            alt={slide.alt}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ${
              slideIndex === index ? "scale-[1.05] opacity-100" : "scale-100 opacity-0"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent md:from-black/35" />

        {activeSlide?.title && (
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="max-w-[78%] sm:max-w-[70%] lg:max-w-2xl">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-white/75 sm:text-[0.65rem] sm:tracking-[0.28em]">
                Catalogo MAXES
              </p>
              <h2 className="mt-2 text-lg font-black leading-tight text-white sm:text-2xl lg:text-4xl">
                {activeSlide.title}
              </h2>
            </div>
          </div>
        )}

        {activeSlide?.href && (
          <a
            href={activeSlide.href}
            className="absolute inset-0 z-[1]"
            aria-label={activeSlide.title || activeSlide.alt}
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
