"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

const stateEvent = "ogp:navigation-state";
const stateCache = new Map();
const storagePrefix = "ogp:navigation-state:";

function destination(to) {
  if (typeof to === "string") return to;
  return `${to?.pathname || ""}${to?.search || ""}${to?.hash || ""}` || "/";
}

function locationKey(href) {
  if (typeof window === "undefined") return href;
  const url = new URL(href, window.location.href);
  return `${url.pathname}${url.search}`;
}

function rememberState(href, value) {
  const key = locationKey(href);
  stateCache.set(key, value);
  if (typeof window === "undefined") return;
  try {
    if (value === undefined) window.sessionStorage.removeItem(storagePrefix + key);
    else window.sessionStorage.setItem(storagePrefix + key, JSON.stringify(value));
  } catch {
    // Navigation remains available when browser storage is disabled or full.
  }
  window.dispatchEvent(new Event(stateEvent));
}

function readState(key) {
  if (stateCache.has(key)) return stateCache.get(key);
  if (typeof window === "undefined") return undefined;
  try {
    const saved = window.sessionStorage.getItem(storagePrefix + key);
    const value = saved === null ? undefined : JSON.parse(saved);
    stateCache.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export const Link = forwardRef(function Link(
  { to, state, replace, preventScrollReset, onClick, ...props }, ref,
) {
  const href = destination(to);
  return <NextLink {...props} ref={ref} href={href} replace={replace}
    scroll={preventScrollReset ? false : undefined}
    onClick={event => {
      onClick?.(event);
      if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey &&
          !event.shiftKey && !event.altKey && event.button === 0 &&
          (!props.target || props.target === "_self")) rememberState(href, state);
    }} />;
});

export function useParams() {
  return useNextParams() || {};
}

export function useNavigate() {
  const router = useRouter();
  return useCallback((to, options = {}) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
      else if (typeof window !== "undefined") window.history.go(to);
      return;
    }
    const href = destination(to);
    rememberState(href, options.state);
    const settings = { scroll: !options.preventScrollReset };
    if (options.replace) router.replace(href, settings);
    else router.push(href, settings);
  }, [router]);
}

export function useSearchParams() {
  const current = useNextSearchParams();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const query = current?.toString() || "";
  const setParams = useCallback((next, options = {}) => {
    const value = typeof next === "function" ? next(new URLSearchParams(query)) : next;
    const params = new URLSearchParams();
    if (value && typeof value === "object" && !(value instanceof URLSearchParams) && !Array.isArray(value)) {
      for (const [key, entry] of Object.entries(value)) {
        for (const part of Array.isArray(entry) ? entry : [entry]) params.append(key, String(part));
      }
    } else {
      const supplied = new URLSearchParams(value);
      supplied.forEach((entry, key) => params.append(key, entry));
    }
    const search = params.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const href = `${pathname}${search ? `?${search}` : ""}${hash}`;
    if (options.state !== undefined) rememberState(href, options.state);
    const settings = { scroll: !options.preventScrollReset };
    if (options.replace) router.replace(href, settings);
    else router.push(href, settings);
  }, [pathname, query, router]);
  return [new URLSearchParams(query), setParams];
}

export function useLocation() {
  const pathname = usePathname() || "/";
  const params = useNextSearchParams();
  const query = params?.toString() || "";
  const search = query ? `?${query}` : "";
  const key = pathname + search;
  const [stored, setStored] = useState({ key: "", value: undefined });
  useEffect(() => {
    const refresh = () => setStored({ key, value: readState(key) });
    refresh();
    window.addEventListener(stateEvent, refresh);
    window.addEventListener("popstate", refresh);
    return () => {
      window.removeEventListener(stateEvent, refresh);
      window.removeEventListener("popstate", refresh);
    };
  }, [key]);
  return { pathname, search, state: stored.key === key ? stored.value : undefined };
}
