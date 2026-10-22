import Image from "next/image";

interface ProductSummaryProps {
  size?: "large" | "compact";
  showPrice?: boolean;
}

export function ProductSummary({ size = "compact", showPrice = true }: ProductSummaryProps) {
  return (
    <div className={`hret-product hret-product-${size}`}>
      <div className="hret-product-photo">
        <Image
          src="/returns-field-jacket.jpg"
          alt="Olive Field Jacket laid flat"
          width={320}
          height={320}
          sizes="(max-width: 600px) 84px, 200px"
        />
      </div>
      <div className="hret-product-copy">
        <span className="hret-overline">HALDEN / OUTERWEAR</span>
        <h3>Field Jacket</h3>
        <p>Olive · Size M</p>
        <span className="hret-quantity">Quantity 1</span>
      </div>
      {showPrice && <strong className="hret-product-price">£189.00</strong>}
    </div>
  );
}
