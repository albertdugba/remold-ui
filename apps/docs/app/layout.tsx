import { Provider } from "@/components/provider";
import type { Metadata } from "next";
import { absoluteUrl, siteDescription, siteUrl, socialImage } from "@/lib/seo";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Remold UI · Change you can follow",
    template: "%s · Remold UI",
  },
  description: siteDescription,
  applicationName: "Remold UI",
  authors: [{ name: "Albert Dugba", url: "https://github.com/albertdugba" }],
  creator: "Albert Dugba",
  publisher: "Remold UI",
  category: "Developer tools",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "Remold UI",
    title: "Remold UI · Change you can follow",
    description: siteDescription,
    images: [{ url: socialImage, width: 1200, height: 630, alt: "Remold UI interface cards connected by motion traces" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Remold UI · Change you can follow",
    description: siteDescription,
    images: [socialImage],
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: LayoutProps<"/">) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Remold UI",
        url: siteUrl,
        logo: absoluteUrl("/brand/remold-mark-light.svg"),
        sameAs: ["https://github.com/albertdugba/remold-ui"],
      },
      {
        "@type": "WebSite",
        name: "Remold UI",
        url: siteUrl,
        description: siteDescription,
        publisher: { "@type": "Organization", name: "Remold UI" },
      },
      {
        "@type": "SoftwareApplication",
        name: "Remold UI",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: siteDescription,
        url: siteUrl,
        isAccessibleForFree: true,
        license: "https://opensource.org/license/mit",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
