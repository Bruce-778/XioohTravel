"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { pushDataLayerEvent, type DataLayerPayload } from "@/lib/analytics";

type TrackingProps = {
  eventName: string;
  eventPayload?: DataLayerPayload;
};

export function DataLayerEventOnMount({
  eventName,
  eventPayload,
  oncePerSessionKey,
}: TrackingProps & {
  oncePerSessionKey?: string;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    if (oncePerSessionKey) {
      try {
        const storageKey = `xioohtravel.analytics.${oncePerSessionKey}`;
        if (window.sessionStorage.getItem(storageKey)) return;
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // Tracking should never block checkout or confirmation rendering.
      }
    }

    pushDataLayerEvent(eventName, eventPayload);
  }, [eventName, eventPayload, oncePerSessionKey]);

  return null;
}

export function TrackedLink({
  eventName,
  eventPayload,
  onClick,
  children,
  ...props
}: TrackingProps & ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        pushDataLayerEvent(eventName, eventPayload);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

export function TrackedAnchor({
  eventName,
  eventPayload,
  onClick,
  children,
  ...props
}: TrackingProps & AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  const href = props.href;

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        pushDataLayerEvent(eventName, eventPayload);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
