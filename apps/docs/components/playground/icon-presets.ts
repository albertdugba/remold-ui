/**
 * Outline icons drawn for Remold on a 24 × 24 grid, stroked at 2 with round caps and joins.
 * Each is one path; several strokes go in one `d`. They're paired by meaning, but any icon can
 * morph into any other: Remold pairs up the strokes itself.
 */
export interface MorphIcon {
  name: string;
  d: string;
}

export const ICONS = {
  play: "M8 5.5v13l10.5-6.5Z",
  pause: "M8.5 5.5v13M15.5 5.5v13",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  copy: "M9 9h10v10H9ZM5 15V5h10",
  check: "M5 12.5l4.5 4.5L19 7.5",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0",
  bellOff: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0M3.5 3.5l17 17",
  eye: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6ZM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5Z",
  eyeOff: "M3 10.5c2.4 2.8 5.4 4.2 9 4.2s6.6-1.4 9-4.2M7.2 13.6l-1.4 2.2M16.8 13.6l1.4 2.2",
  lock: "M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  unlock: "M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2",
  sun: "M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
  mic: "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
  micOff: "M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M3.5 3.5l17 17",
  volume: "M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  mute: "M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM16 9.5l5 5M21 9.5l-5 5",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
  star: "M12 3.5l2.6 5.6 6 .6-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4.1 6-.6Z",
  cloud: "M7 18h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 11a3.5 3.5 0 0 0 0 7Z",
  rain: "M7 14h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 7a3.5 3.5 0 0 0 0 7ZM8 17l-1 3M12 17l-1 3M16 17l-1 3",
  wifi: "M12 19h.01M8.5 15.5a5 5 0 0 1 7 0M5.5 12.5a9 9 0 0 1 13 0M2.5 9.5a13 13 0 0 1 19 0",
  wifiOff: "M12 19h.01M8.5 15.5a5 5 0 0 1 7 0M5.5 12.5a9 9 0 0 1 13 0M2.5 9.5a13 13 0 0 1 19 0M3.5 3.5l17 17",
  home: "M4 11 12 4l8 7M6 9.5V20h12V9.5",
  search: "M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13ZM15.5 15.5 20 20",
  mail: "M4 6h16v12H4ZM4 7l8 6 8-6",
  send: "M4 12 20 4l-6 16-3-7ZM11 13l9-9",
  trash: "M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  done: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17ZM8 12.5l3 3 5-6",
  grid: "M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  bookmark: "M6 4h12v16l-6-4-6 4Z",
  saved: "M6 4h12v16l-6-4-6 4ZM9 10l2 2 4-4",
  user: "M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
} as const;

export type IconName = keyof typeof ICONS;

/** Pairs that swap on tap: the state an app would switch between. */
export const PAIRS: [IconName, IconName][] = [
  ["play", "pause"],
  ["menu", "close"],
  ["plus", "minus"],
  ["copy", "check"],
  ["bell", "bellOff"],
  ["eye", "eyeOff"],
  ["lock", "unlock"],
  ["sun", "moon"],
  ["mic", "micOff"],
  ["volume", "mute"],
  ["arrowUp", "arrowDown"],
  ["heart", "star"],
  ["cloud", "rain"],
  ["wifi", "wifiOff"],
  ["home", "search"],
  ["mail", "send"],
  ["trash", "undo"],
  ["chevronDown", "chevronUp"],
  ["download", "done"],
  ["grid", "list"],
  ["bookmark", "saved"],
  ["user", "logout"],
];

/** "bellOff" → "Bell off". */
export const label = (name: IconName) => {
  const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
