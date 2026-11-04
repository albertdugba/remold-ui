import { source } from "@/lib/source";
import { CATALOGUE } from "./catalogue";
import { ComponentBrowser, type BrowserItem } from "./component-browser";
import meta from "../content/docs/components/meta.json";

/** Each component page's sidebar section ("---Form elements---"), by slug. */
const SECTION: Record<string, string> = {};
{
  let section = "Interface";
  for (const page of meta.pages) {
    const header = page.match(/^---(.+)---$/);
    if (header) section = header[1]!;
    else SECTION[page] = section;
  }
}

const ORDER = [
  "project-setup",
  "signature",
  "task-list",
  "comment-thread",
  "hold-to-record",
  "table-booking",
  "otp-input",
  "live-room",
  "course-outline",
  "podcast-player",
  "two-factor",
  "invite-team",
  "logo-morph",
  "morph-icons",
  "voice-orb",
];

/**
 * The components page: the landing page's cards first, exactly as they are there (the browser reads
 * them from the landing page itself), then the documented examples the landing page doesn't show.
 */
export function AllComponents() {
  const documented: BrowserItem[] = source
    .getPages()
    .filter(
      (page) =>
        page.url.startsWith("/docs/components/") &&
        page.url !== "/docs/components",
    )
    .map((page) => ({
      id: page.url.split("/").pop()!,
      title: page.data.title,
      description: page.data.description ?? "",
      href: page.url,
      category: SECTION[page.url.split("/").pop()!] ?? "Interface",
      isNew: page.data.status === "new",
    }));
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return (
    <ComponentBrowser
      extras={[...documented, ...CATALOGUE.home.items].sort(
        (a, b) => rank(a.id) - rank(b.id),
      )}
    />
  );
}
