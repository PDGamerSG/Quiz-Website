import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const TRANSITION = "transition-all duration-300 ease-[cubic-bezier(0.45,0.05,0.55,0.95)]";

type ButtonVariant = "primary" | "glass" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background font-medium hover:bg-foreground/85 disabled:hover:bg-foreground",
  glass:
    "border border-white/10 bg-white/5 text-muted-foreground backdrop-blur-md hover:border-white/20 hover:bg-white/10 hover:text-foreground",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-white/5",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm",
        "disabled:cursor-not-allowed disabled:opacity-40",
        TRANSITION,
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-md">
      {icon}
      {children}
    </span>
  );
}

/** Ambient glow + graph-paper grid shared by every screen. */
export function Backdrop() {
  return (
    <>
      <div className="pointer-events-none fixed -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full glow" />
      <div className="pointer-events-none fixed inset-0 grid-bg" />
    </>
  );
}
