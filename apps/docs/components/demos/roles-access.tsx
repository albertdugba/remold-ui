"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Select } from "@base-ui/react/select";
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { CODE_GLYPH, CREDIT_CARD_GLYPH, LOCK_GLYPH } from "./demo-glyphs";
import { NIGHT, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";
import "./roles-access.css";

type SceneProps = Remold.Scene.Props;
type Role = "admin" | "editor" | "viewer" | "removed";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "removed", label: "Removed" },
];

const PEOPLE = [
  { id: "ama", name: "Ama Mensah", initials: "AM" },
  { id: "kofi", name: "Kofi Boateng", initials: "KB" },
  { id: "esi", name: "Esi Ofori", initials: "EO" },
] as const;
type Person = (typeof PEOPLE)[number]["id"];

const RESOURCES = [
  { id: "projects", label: "Projects", icon: CODE_GLYPH },
  { id: "billing", label: "Billing", icon: CREDIT_CARD_GLYPH },
  { id: "settings", label: "Settings", icon: LOCK_GLYPH },
] as const;

/** What each role opens: full access, or read-only (a dashed wire). */
const ACCESS: Record<Role, { to: string; read?: boolean }[]> = {
  admin: [{ to: "projects" }, { to: "billing" }, { to: "settings" }],
  editor: [{ to: "projects" }, { to: "settings", read: true }],
  viewer: [{ to: "projects", read: true }],
  removed: [],
};

type Team = Record<Person, Role>;
const key = (team: Team) => PEOPLE.map((p) => team[p.id]).join("-");

const OBJECTS: SceneProps["objects"] = {
  ...Object.fromEntries(
    PEOPLE.map((p) => [p.id, { look: extrude({ shape: "ellipse", sides: "sheen", edge: true, decal: { text: p.initials, size: 16 } }), label: p.name }]),
  ),
  ...Object.fromEntries(
    RESOURCES.map((r) => [
      r.id,
      { look: extrude({ radius: 0.16, ink: WIRE_INK, shadow: false, decal: { icon: r.icon, text: "", size: 28, color: "#cfc9ee" } }), label: r.label },
    ]),
  ),
};

/** Every combination of roles the page can show, as layouts with their own wires. */
const TEAMS: Team[] = ROLES.flatMap((a) =>
  ROLES.flatMap((k) => ROLES.map((e) => ({ ama: a.value, kofi: k.value, esi: e.value }))),
);

function layoutFor(team: Team): SceneProps["layouts"][string] {
  return {
    camera: { zoom: 1.75, centerX: -50, centerY: -80 },
    caption: PEOPLE.map((p) => `${p.name}: ${ROLES.find((r) => r.value === team[p.id])!.label}`).join(". "),
    objects: {
      // Equal x − y keeps each group in an upright column on screen: people left, doors right.
      ...Object.fromEntries(
        PEOPLE.map((p, i) => {
          const gone = team[p.id] === "removed";
          const t = (i - 1) * 125;
          return [p.id, { x: -225 + t, y: -85 + t, z: gone ? 0 : 8, width: 70, depth: 70, height: gone ? 6 : 14, ghost: gone ? 0.9 : 0 }];
        }),
      ),
      ...Object.fromEntries(
        RESOURCES.map((r, i) => {
          const t = (i - 1) * 125;
          return [r.id, { x: 45 + t, y: -155 + t, z: 0, width: 90, depth: 90, height: 22 }];
        }),
      ),
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(TEAMS.map((t) => [key(t), layoutFor(t)]));

/** One link per person-door-kind, listing the layouts it shows in. */
const LINKS: SceneProps["links"] = (() => {
  const links = new Map<string, NonNullable<SceneProps["links"]>[number]>();
  for (const team of TEAMS)
    for (const p of PEOPLE)
      for (const a of ACCESS[team[p.id]]) {
        const id = `${p.id}>${a.to}:${a.read ? "read" : "full"}`;
        const link = links.get(id) ?? { from: p.id, to: a.to, dashed: a.read, flow: !a.read, layouts: [] };
        link.layouts!.push(key(team));
        links.set(id, link);
      }
  return [...links.values()];
})();

interface State {
  team: Team;
}

const BEATS: readonly (State & { ms: number })[] = [
  { team: { ama: "admin", kofi: "editor", esi: "viewer" }, ms: 1800 },
  { team: { ama: "admin", kofi: "editor", esi: "editor" }, ms: 2000 },
  { team: { ama: "admin", kofi: "removed", esi: "editor" }, ms: 2400 },
];

const fromBeat = (step: number): State => ({ team: BEATS[step]!.team });

interface RolesAccessProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function RolesAccess({ playing }: RolesAccessProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;

  return (
    <section ref={scene.ref} className="night-stage ra not-prose" aria-label="Roles and access">
      <Remold.Scene
        className="night-scene ra-scene"
        label="Who can open which part of the workspace"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={key(state.team)}
        palette={NIGHT}
        interact={{ drag: false }}
        spring={{ duration: 0.8, bounce: 0.2 }}
      />

      <ul className="ra-rows">
        {PEOPLE.map((p) => (
          <li key={p.id} data-removed={state.team[p.id] === "removed" || undefined}>
            <span className="ra-avatar" aria-hidden="true">
              {p.initials}
            </span>
            <span className="ra-name">{p.name}</span>
            <Select.Root
              items={ROLES}
              value={state.team[p.id]}
              onValueChange={(value) => value && take((s) => ({ team: { ...s.team, [p.id]: value as Role } }))}
              modal={false}
            >
              <Select.Trigger className="ra-role" aria-label={`${p.name}'s role`}>
                <Select.Value />
                <HugeiconsIcon icon={ArrowUpDownIcon} aria-hidden="true" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="ra-layer" sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="ra-menu">
                    {ROLES.map((r) => (
                      <Select.Item key={r.value} value={r.value} className="ra-item">
                        <Select.ItemText>{r.label}</Select.ItemText>
                        <Select.ItemIndicator className="ra-check">
                          <HugeiconsIcon icon={Tick01Icon} aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </li>
        ))}
      </ul>
    </section>
  );
}
