import { Remold } from "@remold-ui/react";
import { useRef, useState } from "react";
import { PressRow, SelectRow, SwitchRow, TextRow, type Choice } from "./controls";

const REGIONS: readonly Choice[] = [
  { value: "europe", label: "Europe" },
  { value: "north-america", label: "North America" },
  { value: "west-africa", label: "West Africa" },
  { value: "asia-pacific", label: "Asia Pacific" },
];

const ROLES: readonly Choice[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const PEOPLE = [
  { id: "ama", name: "Ama Owusu", email: "ama@example.com", initials: "AO" },
  { id: "kofi", name: "Kofi Mensah", email: "kofi@example.com", initials: "KM" },
  { id: "esi", name: "Esi Boateng", email: "esi@example.com", initials: "EB" },
] as const;

const ALERTS = [
  { id: "email", label: "Email alerts" },
  { id: "digest", label: "Weekly digest" },
] as const;

const HEADING = "m-0 pt-4 pb-1 text-[12.5px] font-medium text-(--muted)";

export function Settings() {
  const [name, setName] = useState("Apollo");
  const [region, setRegion] = useState("europe");
  const [roles, setRoles] = useState<Record<string, string>>({ ama: "member", kofi: "admin", esi: "viewer" });
  const [alerts, setAlerts] = useState<Record<string, boolean>>({ email: true, digest: false });
  const [deleted, setDeleted] = useState(false);
  const [height, setHeight] = useState<number>();
  const card = useRef<HTMLElement>(null);
  const title = name.trim() || "Untitled";

  const remove = () => {
    setHeight(card.current?.offsetHeight);
    setDeleted(true);
  };

  return (
    <Remold.Morph trigger={deleted}>
      <section
        ref={card}
        data-settings=""
        style={{ minHeight: deleted ? height : undefined }}
        className="grid grid-cols-[minmax(0,1fr)] rounded-[28px] bg-(--surface) px-6 pt-6 pb-3 text-(--ink)"
        aria-label="Project settings"
      >
        <header data-deleted={deleted || undefined} className="group/head flex items-center gap-3 data-deleted:m-auto data-deleted:flex-col data-deleted:pb-3 data-deleted:text-center">
          <span
            data-deleted={deleted || undefined}
            className="grid size-10 flex-none place-items-center rounded-[12px] bg-(--ink) text-[16px] font-semibold text-white uppercase transition-[background-color] duration-300 ease-out data-deleted:bg-[#8f8f99] motion-reduce:transition-none"
            aria-hidden="true"
          >
            <Remold.Text className="inline-block whitespace-nowrap">{title.charAt(0)}</Remold.Text>
          </span>
          <div className="grid min-w-0 flex-1 leading-[1.3] group-data-deleted/head:flex-none group-data-deleted/head:justify-items-center">
            <h1 className="m-0 truncate text-[17px] font-semibold tracking-[-0.01em]">
              <Remold.Text className="inline-block whitespace-nowrap">{title}</Remold.Text>
            </h1>
            <p className="m-0 text-[13px] text-(--muted)">
              <Remold.Text className="inline-block whitespace-nowrap">{deleted ? "Deleted just now" : "Project settings"}</Remold.Text>
            </p>
          </div>
          {deleted && (
            <button
              type="button"
              onClick={() => setDeleted(false)}
              className="mt-1 h-9 flex-none cursor-pointer rounded-[10px] border-0 bg-(--well) px-3.5 font-sans text-[14px] font-semibold text-(--ink) outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-(--rule) focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] active:scale-[0.97] motion-reduce:transition-none"
            >
              Restore
            </button>
          )}
        </header>

        {!deleted && (
          <div className="grid grid-cols-[minmax(0,1fr)]">
            <h2 className={HEADING}>General</h2>
            <TextRow label="Project name" value={name} onChange={setName} />
            <SelectRow
              label="Region"
              items={REGIONS}
              value={region}
              onChange={setRegion}
              confirm="Moves the project’s data to another region, with about two minutes of downtime."
              wide
            />

            <h2 className={HEADING}>Members</h2>
            {PEOPLE.map((person) => (
              <SelectRow
                key={person.id}
                label={`Role for ${person.name}`}
                items={ROLES}
                value={roles[person.id]}
                onChange={(role) => setRoles((current) => ({ ...current, [person.id]: role }))}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid size-8 flex-none place-items-center rounded-full bg-(--well) text-[11.5px] font-semibold transition-[background-color] duration-200 ease-out group-data-focused/row:bg-(--surface) motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    {person.initials}
                  </span>
                  <span className="grid min-w-0 leading-[1.3]">
                    <span className="truncate text-[14px] font-medium">{person.name}</span>
                    <span className="truncate text-[12.5px] text-(--muted)">{person.email}</span>
                  </span>
                </span>
              </SelectRow>
            ))}

            <h2 className={HEADING}>Notifications</h2>
            {ALERTS.map((alert) => (
              <SwitchRow
                key={alert.id}
                label={alert.label}
                checked={alerts[alert.id]}
                onChange={(checked) => setAlerts((current) => ({ ...current, [alert.id]: checked }))}
              />
            ))}

            <h2 className={HEADING}>Danger zone</h2>
            <PressRow
              label="Delete project"
              hint="Removes the project and its data."
              text="Delete"
              confirm="Permanently deletes this project and everything in it."
              onPress={remove}
            />
          </div>
        )}
      </section>
    </Remold.Morph>
  );
}
