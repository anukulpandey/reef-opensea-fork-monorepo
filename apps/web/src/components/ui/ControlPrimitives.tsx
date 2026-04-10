import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NavLink } from "react-router-dom";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type PrimitiveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
  className?: string;
};

type PrimitiveLinkProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
  to: string;
};

export function FilterChipButton({
  active = false,
  className,
  children,
  ...props
}: PrimitiveButtonProps) {
  return (
    <button
      {...props}
      className={joinClasses("profileFilterChip", active && "active", className)}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function IconChipButton({
  active = false,
  className,
  children,
  ...props
}: PrimitiveButtonProps) {
  return (
    <button
      {...props}
      className={joinClasses("iconChip", active && "active", className)}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function GhostIconButton({
  active = false,
  className,
  children,
  ...props
}: PrimitiveButtonProps) {
  return (
    <button
      {...props}
      className={joinClasses("ghostIcon", active && "active", className)}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function HeroBadgePill({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={joinClasses("heroBadge", className)}>{children}</span>;
}

export function SurfaceTabButton({
  active = false,
  className,
  children,
  ...props
}: PrimitiveButtonProps) {
  return (
    <button
      {...props}
      className={joinClasses("tabLink", active && "active", className)}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function DetailTabButton({
  active = false,
  className,
  children,
  ...props
}: PrimitiveButtonProps) {
  return (
    <button
      {...props}
      className={joinClasses("detailTab", active && "active", className)}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function SurfaceTabLink({
  active = false,
  className,
  children,
  to
}: PrimitiveLinkProps) {
  return (
    <NavLink
      to={to}
      className={joinClasses("tabLink", active && "active", className)}
    >
      {children}
    </NavLink>
  );
}
