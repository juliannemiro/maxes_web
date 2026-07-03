"use client";

interface QuantitySelectorProps {
  value: string | number;
  onChange: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  valueClassName?: string;
  error?: boolean;
  placeholder?: string;
}

export default function CantidadSelector({
  value,
  onChange,
  onDecrement,
  onIncrement,
  ariaLabel = "Cantidad",
  className = "",
  buttonClassName = "",
  valueClassName = "",
  error = false,
  placeholder = "0",
}: QuantitySelectorProps) {
  return (
    <div
      className={`flex items-center overflow-hidden rounded-lg ${
        error
          ? "border border-red-500 bg-red-50 text-red-700"
          : "border border-slate-200 bg-slate-50"
      } ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Disminuir cantidad"
        className={`px-3 py-2 text-lg font-bold text-slate-500 transition hover:bg-slate-100 ${buttonClassName}`.trim()}
      >
        -
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`min-w-0 flex-1 bg-transparent px-2 text-center text-base font-bold text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-400 ${valueClassName}`.trim()}
      />
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Aumentar cantidad"
        className={`px-3 py-2 text-lg font-bold text-slate-500 transition hover:bg-slate-100 ${buttonClassName}`.trim()}
      >
        +
      </button>
    </div>
  );
}
