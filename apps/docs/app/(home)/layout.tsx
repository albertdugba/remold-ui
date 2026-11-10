import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import "./home.css";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    // A wider frame than Fumadocs' 1400 px default, shared by the navbar and the page (home.css --hm-max).
    <HomeLayout {...baseOptions()} className="[--fd-layout-width:1760px]">
      {children}
    </HomeLayout>
  );
}
