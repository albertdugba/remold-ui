import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { siteUrl } from "@/lib/shared";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
