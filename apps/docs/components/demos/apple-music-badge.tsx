"use client";
import type { CSSProperties } from "react";
import { useInPreview } from "./portal-container";

const LEAF =
  "M11.703 5.616c.03-.905.278-2.237 1.145-3.112c.805-.813 1.785-1.209 2.395-1.39a.347.347 0 0 1 .45.353c-.04.866-.268 2.158-.856 2.85c-.554.652-1.444 1.516-2.749 1.662a.348.348 0 0 1-.385-.363";
const APPLE =
  "M13.937 22.17c.627.24 1.26.482 1.833.482c1.227 0 4.798-2.83 4.926-5.768a.4.4 0 0 0-.215-.36c-.908-.508-2.392-1.774-2.443-3.615c-.06-2.146 1.017-3.85 1.832-4.555c.184-.159.247-.439.083-.617c-.742-.81-2.234-1.925-3.596-1.898c-.99.02-1.883.39-2.65.706c-.587.243-1.1.455-1.526.455c-.403 0-.887-.21-1.443-.453c-.748-.326-1.626-.708-2.61-.708c-1.824 0-5.428 1.513-5.428 7.352c0 3.095 3.195 9.543 5.892 9.461c.582 0 1.204-.24 1.822-.48c.608-.236 1.211-.47 1.767-.47c.537 0 1.143.233 1.756.468";

const BADGE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 12px 0 9px",
  borderRadius: 7,
  background: "#000",
  boxShadow: "inset 0 0 0 1px #a6a6a6",
  color: "#fff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  lineHeight: 1,
  textDecoration: "none",
};

/**
 * A "Listen on Apple Music" badge, for players that use Apple Music's previews: the Apple logo,
 * "Listen on" and "MUSIC", linking to the artist there.
 */
export function AppleMusicBadge() {
  const badge = (
    <span style={BADGE}>
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        aria-hidden="true"
        style={{ flex: "none", marginTop: -2 }}
      >
        <path fill="currentColor" d={LEAF} />
        <path fill="currentColor" d={APPLE} />
      </svg>
      <span style={{ display: "grid", gap: 2 }}>
        <span style={{ fontSize: 8.5, fontWeight: 500, letterSpacing: "0.01em" }}>Listen on</span>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>MUSIC</span>
      </span>
    </span>
  );
  if (useInPreview()) return <span aria-label="Listen on Apple Music">{badge}</span>;
  return (
    <a
      href="https://music.apple.com/gh/artist/kofi-kinaata/744862250"
      target="_blank"
      rel="noreferrer"
      aria-label="Listen to Kofi Kinaata on Apple Music"
      style={{ display: "inline-flex", textDecoration: "none" }}
    >
      {badge}
    </a>
  );
}
