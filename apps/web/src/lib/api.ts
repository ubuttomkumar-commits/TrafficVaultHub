/**
 * API base URL: empty in local preview (Vite dev server handles mock /api),
 * pointing directly to live Cloudflare Worker when hosted on Cloudflare Pages.
 */
const envBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();

export const API_BASE =
  envBase !== undefined && envBase !== ""
    ? envBase
    : typeof window !== "undefined" && window.location.hostname.includes("pages.dev")
    ? "https://trafficvaulthub.uttombarmon45.workers.dev"
    : "";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
