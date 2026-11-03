import {
  CareJourney,
  CenterFlow,
  DataPrivacyBoundary,
  DomainConnection,
  RealtimeCollaboration,
  SubscriptionUpgrade,
  TeamWorkspace,
  TransactionRoute,
  UptimeRouting,
  WalletSecurityMap,
} from "@/components/demos";

export const metadata = {
  title: "Illustration primitives · Remold UI",
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
        <CenterFlow />
        <TransactionRoute />
        <WalletSecurityMap />
        <CareJourney />
        <DomainConnection />
        <DataPrivacyBoundary />
        <SubscriptionUpgrade />
        <UptimeRouting />
        <RealtimeCollaboration />
        <TeamWorkspace />
      </section>
    </main>
  );
}
