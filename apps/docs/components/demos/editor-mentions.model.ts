export interface MentionPerson {
  id: string;
  name: string;
  role: string;
  online?: boolean;
}

export type MentionSegment = { kind: "text"; text: string } | { kind: "mention"; id: string; key: string };

export interface MentionPost {
  id: string;
  who: string;
  segs: MentionSegment[];
  when: string;
}

export interface MentionsState {
  segs: MentionSegment[];
  /** Text typed after `@`; null when the picker is closed. */
  query: string | null;
  active: number;
  posts: MentionPost[];
  made: number;
}

export type MentionsAction =
  | { type: "type"; character: string }
  | { type: "backspace" }
  | { type: "move"; direction: 1 | -1 }
  | { type: "pick"; id?: string }
  | { type: "dismiss" }
  | { type: "send" };

export const people: MentionPerson[] = [
  { id: "ama", name: "Ama Mensah", role: "Design lead", online: true },
  { id: "abena", name: "Abena Osei", role: "Product manager" },
  { id: "akua", name: "Akua Asante", role: "Copywriter", online: true },
  { id: "kwame", name: "Kwame Owusu", role: "Engineer", online: true },
  { id: "kofi", name: "Kofi Agyeman", role: "Finance" },
  { id: "esi", name: "Esi Ofori", role: "Research" },
];

const firstPost: MentionPost = {
  id: "p0",
  who: "Akua Asante",
  segs: [
    {
      kind: "text",
      text: "Pricing page v3 is ready. The yearly toggle copy still feels long to me.",
    },
  ],
  when: "10:42",
};

export const initialMentionsState: MentionsState = {
  segs: [],
  query: null,
  active: 0,
  posts: [firstPost],
  made: 0,
};

export function personById(id: string): MentionPerson {
  const person = people.find((candidate) => candidate.id === id);
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}

export function avatarUrl(name: string): string {
  const colours = ["e0e7ff", "fce7f3", "d1fae5", "fef3c7"];
  const background = colours[name.length % colours.length]!;
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}&backgroundColor=${background}`;
}

export function matchingPeople(query: string): MentionPerson[] {
  const lowerQuery = query.toLowerCase();
  return people.filter((person) =>
    person.name
      .toLowerCase()
      .split(" ")
      .some((word) => word.startsWith(lowerQuery)),
  );
}

function appendText(segs: MentionSegment[], text: string): MentionSegment[] {
  const last = segs.at(-1);
  if (last?.kind === "text") return [...segs.slice(0, -1), { kind: "text", text: last.text + text }];
  return [...segs, { kind: "text", text }];
}

export function reduceMentions(state: MentionsState, action: MentionsAction): MentionsState {
  switch (action.type) {
    case "type": {
      if (state.query !== null) {
        if (action.character === " ") {
          const dismissed = reduceMentions(state, { type: "dismiss" });
          return { ...dismissed, segs: appendText(dismissed.segs, " ") };
        }
        return { ...state, query: state.query + action.character, active: 0 };
      }
      if (action.character === "@") return { ...state, query: "", active: 0 };
      return { ...state, segs: appendText(state.segs, action.character) };
    }
    case "backspace": {
      if (state.query !== null)
        return state.query
          ? { ...state, query: state.query.slice(0, -1), active: 0 }
          : { ...state, query: null };
      const last = state.segs.at(-1);
      if (!last) return state;
      if (last.kind === "mention") return { ...state, segs: state.segs.slice(0, -1) };
      const text = last.text.slice(0, -1);
      return {
        ...state,
        segs: text ? [...state.segs.slice(0, -1), { kind: "text", text }] : state.segs.slice(0, -1),
      };
    }
    case "move": {
      if (state.query === null) return state;
      const count = matchingPeople(state.query).length;
      return count
        ? {
            ...state,
            active: (state.active + action.direction + count) % count,
          }
        : state;
    }
    case "pick": {
      if (state.query === null) return state;
      const id = action.id ?? matchingPeople(state.query)[state.active]?.id;
      if (!id) return state;
      return {
        ...state,
        query: null,
        active: 0,
        made: state.made + 1,
        segs: [...state.segs, { kind: "mention", id, key: `m${state.made}` }, { kind: "text", text: " " }],
      };
    }
    case "dismiss":
      return state.query === null
        ? state
        : {
            ...state,
            query: null,
            segs: appendText(state.segs, `@${state.query}`),
          };
    case "send": {
      const segs = state.segs.filter((segment) => segment.kind === "mention" || segment.text.trim());
      if (!segs.length) return state;
      const post: MentionPost = {
        id: `p${state.posts.length}-${state.made}`,
        who: "You",
        segs: state.segs,
        when: "Just now",
      };
      return {
        ...state,
        segs: [],
        query: null,
        posts: [...state.posts, post].slice(-3),
      };
    }
  }
}

/** A concise caption for the people who will be notified. */
export function notificationLabel(names: readonly string[]): string {
  if (names.length <= 3) return new Intl.ListFormat("en-GB", { type: "conjunction" }).format(names);
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`;
}
