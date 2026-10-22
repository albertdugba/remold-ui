/**
 * A payment card, drawn in CSS for the fintech examples. The bank, the network wordmark and
 * the holder are invented; nothing here imitates a real card scheme.
 */
import type { ReactNode } from "react";

export type CardTone = "ocean" | "dusk" | "fern" | "graphite" | "gold" | "metal" | "coral";

export interface PayCardProps {
  tone: CardTone;
  /** Top right: "Debit", "Credit", a plan name. */
  kind: ReactNode;
  /** The card number as shown, already masked or formatted. */
  number: ReactNode;
  expires: ReactNode;
  holder?: string;
  /** Rendered as a button when given. */
  onClick?: () => void;
  disabled?: boolean;
  /** The button's accessible name. */
  label?: string;
  className?: string;
  /** Extra content over the card, such as a "Frozen" badge. */
  children?: ReactNode;
}

/** The chip and the contactless mark, drawn for this page. */
const Chip = () => (
  <svg className="pay-chip" viewBox="0 0 40 30" aria-hidden="true">
    <rect x="0.5" y="0.5" width="39" height="29" rx="6" />
    <path d="M0.5 10.5h12v9h-12M39.5 10.5h-12v9h12M12.5 0.5v29M27.5 0.5v29M12.5 15h15" />
  </svg>
);
const Contactless = () => (
  <svg className="pay-contactless" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 8.5a5 5 0 0 1 0 7M10.5 6a8.5 8.5 0 0 1 0 12M14 3.5a12 12 0 0 1 0 17" />
  </svg>
);

export function PayCard({
  tone,
  kind,
  number,
  expires,
  holder = "Alex Morgan",
  onClick,
  disabled,
  label,
  className = "",
  children,
}: PayCardProps) {
  const content = (
    <>
      <span className="pay-top">
        <span className="pay-bank">Northwind</span>
        <span className="pay-kind">{kind}</span>
      </span>
      <span className="pay-middle">
        <Chip />
        <Contactless />
      </span>
      <span className="pay-number">{number}</span>
      <span className="pay-bottom">
        <span>
          <span className="pay-label">Card holder</span>
          {holder}
        </span>
        <span>
          <span className="pay-label">Expires</span>
          {expires}
        </span>
        <span className="pay-network" aria-hidden="true">
          nova
        </span>
      </span>
      {children}
    </>
  );
  const classes = `pay-card ${className}`.trim();
  return onClick ? (
    <button type="button" className={classes} data-tone={tone} onClick={onClick} disabled={disabled} aria-label={label}>
      {content}
    </button>
  ) : (
    <div className={classes} data-tone={tone}>
      {content}
    </div>
  );
}
