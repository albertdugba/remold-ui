import {
  CardPaymentScroll,
  CareJourneyDemo,
  CenterFlow,
  DataPrivacyBoundary,
  DomainConnection,
  ExplodedStack,
  RealtimeCollaboration,
  RolloutGrid,
  SubscriptionUpgrade,
  TeamWorkspace,
  TokenBucket,
  TransactionRouteDemo,
  UptimeReroute,
  WalletSecurityMapDemo,
  WebhookDelivery,
} from "@/components/demos";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Illustration primitives",
  description: "Interactive canvas product illustrations built with Remold primitives.",
};

export default function IllustrationsPage() {
  return (
    <main className="ip">
      <header className="ip-head">
        <p className="hm-kicker">Illustration primitives</p>
        <h1>Product systems you can see.</h1>
        <p>
          Interactive canvas studies built from the same scene, layout, and
          motion primitives as the rest of the library.
        </p>
      </header>
      <section className="ip-grid" aria-label="Interactive product illustrations">
        <CardPaymentScroll />
        <TokenBucket />
        <WebhookDelivery />
        <UptimeReroute />
        <DomainConnection />
        <DataPrivacyBoundary />
        <SubscriptionUpgrade />
        <RealtimeCollaboration />
        <TeamWorkspace />
        <ExplodedStack />
        <RolloutGrid />
        <CenterFlow />
        <TransactionRouteDemo />
        <WalletSecurityMapDemo />
        <CareJourneyDemo />
      </section>
    </main>
  );
}
