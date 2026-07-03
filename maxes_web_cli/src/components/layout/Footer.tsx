interface FooterProps {
  direccionLocal?: string;
  telefono?: string;
}

export default function Footer({
  direccionLocal = "Pasteur 70 | Once",
  telefono = "+5491128478046",
}: FooterProps) {
  return (
    <footer className="bg-[var(--color-header)] py-8 text-center text-[var(--color-header-foreground)]">
      <p className="text-2xl font-black">
        M<span className="text-[var(--color-primary)]">@</span>XES
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
        Tus insumos en un solo lugar
      </p>
      <p className="mt-3 text-sm text-white/80">
        {direccionLocal} · {telefono}
      </p>
    </footer>
  );
}
