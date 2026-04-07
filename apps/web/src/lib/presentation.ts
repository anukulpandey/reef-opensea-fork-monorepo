import type { CSSProperties } from "react";
import type { ThemePalette } from "../types";

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const mappedPort =
      port === "3002" ? "4010" : port === "3001" ? "4002" : "4000";
    return `${protocol}//${hostname}:${mappedPort}`;
  }

  return "http://localhost:4000";
}

const apiBaseUrl = resolveApiBaseUrl();

export function assetUrl(url: string) {
  if (!url.startsWith("/")) {
    return url;
  }
  if (url.startsWith("/storage/")) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
}

export function themeStyle(theme: ThemePalette): CSSProperties {
  return {
    "--accent": theme.accent,
    "--accent-soft": theme.accentSoft,
    "--hero-background": theme.heroBackground,
    "--panel-surface": theme.panelSurface,
    "--hero-text": theme.textOnHero
  } as CSSProperties;
}
