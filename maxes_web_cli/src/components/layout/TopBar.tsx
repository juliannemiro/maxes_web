"use client";

import { usePurchaseMode } from "../../context/PurchaseModeContext";

interface TopBarProps {
  direccionLocal?: string;
  whatsappContact?: string;
}

export default function TopBar({
  direccionLocal = "Pasteur 70 | Once",
  whatsappContact = "+5491128478046",
}: TopBarProps) {
  const { tipoCompra, setTipoCompra } = usePurchaseMode();
  const whatsappLink = `https://wa.me/${whatsappContact.replace(/[^0-9]/g, "")}`;

  return (
    <div className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-2 text-[11px] font-semibold sm:gap-4 sm:px-8 sm:text-sm xl:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21s-7-4.35-7-11a7 7 0 1 1 14 0c0 6.65-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="truncate">{direccionLocal}</span>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap hover:underline"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.62 2.65a2 2 0 0 1-.45 2.11L8 9.76a16 16 0 0 0 6.24 6.24l1.28-1.28a2 2 0 0 1 2.11-.45c.86.29 1.75.5 2.65.62A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>{whatsappContact}</span>
        </a>

        <select
          aria-label="Tipo de compra"
          value={tipoCompra}
          onChange={(e) => setTipoCompra(e.target.value as "mayorista" | "minorista")}
          className="h-7 w-[6.4rem] justify-self-end rounded border border-black/15 bg-white px-2 text-[11px] font-bold uppercase text-[var(--color-foreground)] outline-none sm:h-8 sm:w-[7rem] sm:text-xs"
        >
          <option value="mayorista">Mayorista</option>
          <option value="minorista">Minorista</option>
        </select>
      </div>
    </div>
  );
}
