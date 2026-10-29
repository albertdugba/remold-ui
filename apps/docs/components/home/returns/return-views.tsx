import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, CheckmarkCircle02Icon, CreditCardIcon, PackageIcon, RotateLeft01Icon, Tick01Icon, TruckIcon } from "@hugeicons/core-free-icons";
import { ProductSummary } from "./product-summary";
import { RETURN_REASONS, type RefundMethod, type ReturnReason } from "./return-data";

export function OrderView({ onStartReturn }: { onStartReturn: () => void }) {
  return (
    <section className="hret-view" aria-label="Delivered order">
      <div className="hret-page-heading">
        <div>
          <span className="hret-overline">YOUR ORDERS / #HLD-10482</span>
          <h2>Order details</h2>
          <p>Placed 8 October 2026 · 1 item</p>
        </div>
        <span className="hret-status hret-status-delivered">
          <span /> Delivered
        </span>
      </div>

      <div className="hret-order-card">
        <div className="hret-order-card-head">
          <span>Delivered 15 October</span>
          <span>Order #HLD-10482</span>
        </div>
        <ProductSummary size="large" />
        <div className="hret-order-actions">
          <span>Eligible for return until 14 November</span>
          <button type="button" className="hret-primary-button" onClick={onStartReturn}>
            Return item <HugeiconsIcon icon={ArrowRight01Icon} size={17} />
          </button>
        </div>
      </div>

      <div className="hret-delivery-note">
        <span className="hret-delivery-icon">
          <HugeiconsIcon icon={TruckIcon} size={19} strokeWidth={1.8} />
        </span>
        <div>
          <strong>Delivered to your door</strong>
          <span>15 October at 13:42 · London, UK</span>
        </div>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="hret-delivery-check" />
      </div>
    </section>
  );
}

interface ReturnFormProps {
  reason: ReturnReason | null;
  refundMethod: RefundMethod;
  onReasonChange: (reason: ReturnReason) => void;
  onRefundMethodChange: (method: RefundMethod) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReturnForm({ reason, refundMethod, onReasonChange, onRefundMethodChange, onBack, onSubmit }: ReturnFormProps) {
  return (
    <section className="hret-view" aria-label="Return request form">
      <div className="hret-page-heading">
        <div>
          <span className="hret-overline">RETURN / #HLD-10482</span>
          <h2>Return your item</h2>
          <p>Tell us what wasn’t right. We’ll take it from here.</p>
        </div>
        <span className="hret-step">
          01 <span>/ 02</span>
        </span>
      </div>

      <div className="hret-form-product">
        <ProductSummary />
      </div>

      <fieldset className="hret-fieldset">
        <legend>Why are you returning it?</legend>
        <div className="hret-reason-grid">
          {RETURN_REASONS.map((option) => (
            <label className={`hret-option${reason === option.label ? " selected" : ""}`} key={option.label}>
              <input
                type="radio"
                name="return-reason"
                value={option.label}
                checked={reason === option.label}
                onChange={() => onReasonChange(option.label)}
              />
              <span className="hret-radio-mark">
                <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2.5} />
              </span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="hret-fieldset hret-refund-fieldset">
        <legend>How would you like your refund?</legend>
        <div className="hret-refund-options">
          <label className={`hret-refund-option${refundMethod === "Original payment" ? " selected" : ""}`}>
            <input
              type="radio"
              name="refund-method"
              value="Original payment"
              checked={refundMethod === "Original payment"}
              onChange={() => onRefundMethodChange("Original payment")}
            />
            <HugeiconsIcon icon={CreditCardIcon} size={18} />{" "}
            <span>
              <strong>Original payment</strong>
              <small>Visa ending 4829</small>
            </span>
            <span className="hret-radio-ring" />
          </label>
          <label className={`hret-refund-option${refundMethod === "Store credit" ? " selected" : ""}`}>
            <input
              type="radio"
              name="refund-method"
              value="Store credit"
              checked={refundMethod === "Store credit"}
              onChange={() => onRefundMethodChange("Store credit")}
            />
            <HugeiconsIcon icon={RotateLeft01Icon} size={18} />{" "}
            <span>
              <strong>Store credit</strong>
              <small>Ready as soon as we receive it</small>
            </span>
            <span className="hret-radio-ring" />
          </label>
        </div>
      </fieldset>

      <div className="hret-form-actions">
        <button type="button" className="hret-text-button" onClick={onBack}>
          Back to order
        </button>
        <button type="button" className="hret-primary-button" onClick={onSubmit} disabled={!reason}>
          Request return <HugeiconsIcon icon={ArrowRight01Icon} size={17} />
        </button>
      </div>
    </section>
  );
}

export function SubmittedView({ refundMethod }: { refundMethod: RefundMethod }) {
  return (
    <section className="hret-view hret-submitted" aria-label="Return request status">
      <div className="hret-page-heading">
        <div>
          <span className="hret-overline">RETURN / #HLD-10482</span>
          <h2>Return status</h2>
          <p>Request #RET-78104</p>
        </div>
        <span className="hret-status hret-status-requested">
          <span /> Requested
        </span>
      </div>

      <div className="hret-success-card">
        <div className="hret-success-icon">
          <HugeiconsIcon icon={Tick01Icon} size={27} strokeWidth={2.2} />
        </div>
        <span className="hret-overline">REQUEST RECEIVED</span>
        <h3>Your return is underway.</h3>
        <p>We’re preparing a prepaid return label. It’ll be sent to your email within 24 hours.</p>
        <div className="hret-success-product">
          <ProductSummary />
        </div>
      </div>

      <div className="hret-next-steps">
        <span className="hret-step-line done">
          <HugeiconsIcon icon={Tick01Icon} size={13} /> Request sent
        </span>
        <span className="hret-step-connector" />
        <span className="hret-step-line">
          <HugeiconsIcon icon={PackageIcon} size={15} /> Pack &amp; post
        </span>
        <span className="hret-step-connector" />
        <span className="hret-step-line">
          <HugeiconsIcon icon={CreditCardIcon} size={15} /> {refundMethod === "Store credit" ? "Credit issued" : "Refund issued"}
        </span>
      </div>
      <p className="hret-refund-copy">
        {refundMethod === "Store credit"
          ? "Your £189.00 credit will be ready after the item is received."
          : "£189.00 will return to your Visa ending 4829 after the item is inspected."}
      </p>
    </section>
  );
}
