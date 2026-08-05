"use client";

import { useRouter } from "next/navigation";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant = "primary" | "secondary" | "success";

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  href?: string;
  variant?: ActionButtonVariant;
  className?: string;
}

const variantClasses: Record<ActionButtonVariant, string> = {
  primary: "border-amber-300 bg-amber-400 text-amber-950 hover:bg-amber-300",
  secondary: "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200",
  success: "border-green-600 bg-green-600 text-white hover:bg-green-700",
};

export default function ActionButton({
  children,
  href,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
  ...props
}: ActionButtonProps) {
  const router = useRouter();

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && href) router.push(href);
      }}
      className={`flex min-h-12 items-center justify-center rounded-md border px-3 py-3 text-center text-base leading-tight transition-colors [font-family:inherit] [font-weight:700] disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
