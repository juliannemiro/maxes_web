"use client";

import { useEffect, useRef } from "react";
import { Rubro } from "../../types";

interface CategoryCarouselProps {
  rubros: Rubro[];
  onSelect: (categoryId: number | undefined) => void;
}

const categoryImages = [
  "/products/smartwatch.png",
  "/products/powerbank.png",
  "/products/charger.png",
  "/products/cable.png",
  "/products/earbuds.png",
  "/products/joystick.png",
  "/products/speaker.png",
];

const categoryKeywordImageMap: Array<{ keywords: string[]; image: string }> = [
  { keywords: ["cable", "v8", "tipo c", "micro"], image: "/products/cable.png" },
  { keywords: ["parlante", "speaker", "audio"], image: "/products/speaker.png" },
  { keywords: ["auricular", "earbuds", "headset"], image: "/products/earbuds.png" },
  { keywords: ["cargador", "charger", "fuente"], image: "/products/charger.png" },
  { keywords: ["power", "bateria", "banco"], image: "/products/powerbank.png" },
  { keywords: ["reloj", "watch", "smart"], image: "/products/smartwatch.png" },
  { keywords: ["joystick", "game", "control"], image: "/products/joystick.png" },
];

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCategoryImage(rubro: Rubro, index: number) {
  const haystack = `${normalizeText(rubro.codigo)} ${normalizeText(rubro.nombre)}`;
  const mapped = categoryKeywordImageMap.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
  );

  return mapped?.image || categoryImages[index % categoryImages.length];
}

export default function CategoryCarousel({ rubros, onSelect }: CategoryCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollByAmount = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>("[data-rubro-card='true']");
    const gap = window.innerWidth < 640 ? 12 : 16;
    const cardWidth = firstCard?.offsetWidth || (window.innerWidth < 640 ? 144 : 160);
    const step = cardWidth + gap;
    const nextLeft = scroller.scrollLeft + direction * step;
    const maxLeft = scroller.scrollWidth - scroller.clientWidth;

    if (direction > 0 && nextLeft >= maxLeft - 4) {
      scroller.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    if (direction < 0 && scroller.scrollLeft <= 4) {
      scroller.scrollTo({ left: maxLeft, behavior: "smooth" });
      return;
    }

    scroller.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const featured = rubros.filter((rubro) => rubro.activo).slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      scrollByAmount(1);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [featured.length]);

  if (featured.length === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px] px-4 sm:px-8 xl:px-10">
      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        aria-label="Categorías anteriores"
        className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 text-[var(--color-primary)] transition-transform hover:scale-110 sm:block"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div
        id="category-carousel-track"
        ref={scrollerRef}
        className="flex snap-x justify-start gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:justify-center sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {featured.map((rubro, index) => (
          <button
            key={rubro.id}
            type="button"
            onClick={() => onSelect(rubro.id)}
            data-rubro-card="true"
            className="group flex w-36 shrink-0 snap-start flex-col items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white text-center shadow-sm sm:w-40"
          >
            <span className="mt-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--color-primary)] bg-[linear-gradient(180deg,#ffffff_0%,#fff7d6_100%)] sm:h-28 sm:w-28">
              <img
                src={getCategoryImage(rubro, index)}
                alt={rubro.nombre || "Categoría"}
                className="h-20 w-20 object-contain sm:h-24 sm:w-24"
              />
            </span>
            <span className="mt-3 flex min-h-[3.25rem] w-full items-center justify-center bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold leading-tight text-[var(--color-primary-foreground)] sm:text-sm">
              {rubro.nombre || "Sin nombre"}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        aria-label="Más categorías"
        className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 text-[var(--color-primary)] transition-transform hover:scale-110 sm:block"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
