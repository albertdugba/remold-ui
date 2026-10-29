"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon } from "@hugeicons/core-free-icons";
import { Remold, useAutoplay } from "@remold-ui/react";
import { useEffect, useState } from "react";
import "./swap-airports.css";

export interface Airport {
  code: string;
  city: string;
}

export const LHR: Airport = { code: "LHR", city: "London Heathrow" };
export const JFK: Airport = { code: "JFK", city: "New York JFK" };

export function RouteField({
  from,
  to,
  flipped,
  onSwap,
}: {
  from: Airport;
  to: Airport;
  flipped: boolean;
  onSwap: () => void;
}) {
  return (
    <div className="sw">
      <div className="sw-field">
        <span className="sw-label">From</span>
        <strong className="sw-code">{from.code}</strong>
        <span className="sw-city">{from.city}</span>
      </div>
      <div className="sw-field">
        <span className="sw-label">To</span>
        <strong className="sw-code">{to.code}</strong>
        <span className="sw-city">{to.city}</span>
      </div>
      <button
        type="button"
        className="sw-swap"
        data-flipped={flipped || undefined}
        aria-label={`Swap: fly from ${to.city} to ${from.city}`}
        onClick={onSwap}
      >
        <HugeiconsIcon icon={ArrowUpDownIcon} aria-hidden="true" />
      </button>
    </div>
  );
}

const SPRING = { duration: 0.6, bounce: 0.14 };

interface SwapAirportsDemoProps {
  playing?: boolean;
}

export function SwapAirportsDemo({ playing }: SwapAirportsDemoProps = {}) {
  const autoplay = useAutoplay(2, {
    every: 2200,
    stopOnInteraction: playing === undefined,
  });
  const { setPlaying } = autoplay;
  useEffect(() => {
    if (playing !== undefined) setPlaying(playing);
  }, [playing, setPlaying]);

  const [own, setOwn] = useState<boolean | null>(null);
  const swapped = own ?? autoplay.step === 1;

  return (
    <div ref={autoplay.ref} className="sw-demo not-prose">
      <Remold.Layout trigger={swapped} spring={SPRING}>
        <RouteField
          flipped={swapped}
          from={swapped ? JFK : LHR}
          to={swapped ? LHR : JFK}
          onSwap={() => {
            setPlaying(false);
            setOwn(!swapped);
          }}
        />
      </Remold.Layout>
    </div>
  );
}
