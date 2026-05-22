import { useCallback, useEffect, useState } from 'react';

export interface AppLocation {
  pathname: string;
  search: string;
}

const NAV_EVENT = 'tournaments:navigate';

function readLocation(): AppLocation {
  if (typeof window === 'undefined') return { pathname: '/', search: '' };
  return { pathname: window.location.pathname, search: window.location.search };
}

export function useLocation(): AppLocation {
  const [loc, setLoc] = useState<AppLocation>(readLocation);
  useEffect(() => {
    const update = () => setLoc(readLocation());
    window.addEventListener('popstate', update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);
  return loc;
}

export interface NavigateOptions {
  replace?: boolean;
}

export function navigate(to: string, options: NavigateOptions = {}): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname + window.location.search;
  if (to === current) return;
  if (options.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  return useCallback((to, options) => navigate(to, options), []);
}

export function parseTournamentId(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Intercept normal anchor clicks so they go through the router instead of
 * triggering a full page reload. Modifier-clicks and external links pass through.
 */
export function isInternalNavClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string | undefined,
): boolean {
  if (!href) return false;
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return false;
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  return href.startsWith('/');
}
