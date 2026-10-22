"use client";
/**
 * Morph icons: Lucide icons that turn into each other. Tap a tile to swap its pair; the big icon
 * morphs into whichever icon you pick, any to any. While it's on screen and untouched, it plays
 * by itself.
 *
 * `Remold.Icon` takes the icon components as they are: it reads each one's circles, lines,
 * rectangles and paths, and pairs up the strokes itself. Styled with Tailwind. Swap in any other
 * icon set, or your own SVGs, the same way.
 */
import { Remold } from "@remold-ui/react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Cloud,
  CloudRain,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  Heart,
  House,
  LayoutGrid,
  List,
  Lock,
  LockOpen,
  LogOut,
  Mail,
  Menu,
  Mic,
  MicOff,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Star,
  Sun,
  Trash2,
  Undo2,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Pairs that swap on tap: the states an app switches between. Any icon can morph into any other. */
const PAIRS: [[string, LucideIcon], [string, LucideIcon]][] = [
  [
    ["Play", Play],
    ["Pause", Pause],
  ],
  [
    ["Menu", Menu],
    ["Close", X],
  ],
  [
    ["Add", Plus],
    ["Remove", Minus],
  ],
  [
    ["Copy", Copy],
    ["Copied", Check],
  ],
  [
    ["Bell", Bell],
    ["Muted", BellOff],
  ],
  [
    ["Show", Eye],
    ["Hide", EyeOff],
  ],
  [
    ["Locked", Lock],
    ["Unlocked", LockOpen],
  ],
  [
    ["Light", Sun],
    ["Dark", Moon],
  ],
  [
    ["Mic on", Mic],
    ["Mic off", MicOff],
  ],
  [
    ["Sound", Volume2],
    ["Mute", VolumeX],
  ],
  [
    ["Up", ArrowUp],
    ["Down", ArrowDown],
  ],
  [
    ["Like", Heart],
    ["Favourite", Star],
  ],
  [
    ["Cloudy", Cloud],
    ["Rain", CloudRain],
  ],
  [
    ["Online", Wifi],
    ["Offline", WifiOff],
  ],
  [
    ["Home", House],
    ["Search", Search],
  ],
  [
    ["Mail", Mail],
    ["Send", Send],
  ],
  [
    ["Delete", Trash2],
    ["Undo", Undo2],
  ],
  [
    ["Expand", ChevronDown],
    ["Collapse", ChevronUp],
  ],
  [
    ["Download", Download],
    ["Done", CircleCheck],
  ],
  [
    ["Grid", LayoutGrid],
    ["List", List],
  ],
  [
    ["Save", Bookmark],
    ["Saved", BookmarkCheck],
  ],
  [
    ["Account", User],
    ["Sign out", LogOut],
  ],
];
const ALL = PAIRS.flat();

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function MorphIconsDemo() {
  const [flipped, setFlipped] = useState<boolean[]>(() => PAIRS.map(() => false));
  const [big, setBig] = useState(0);
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const [bigName, BigIcon] = ALL[big]!;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? false));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay: flip a few tiles and move the big icon on, until someone takes over.
  useEffect(() => {
    if (touched || !visible) return;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setFlipped((f) => f.map((on, i) => ((i * 7 + step) % 5 === 0 ? !on : on)));
      setBig((step * 5) % ALL.length);
    }, 1100);
    return () => clearInterval(timer);
  }, [touched, visible]);

  return (
    <div ref={frame} className="not-prose my-6 grid gap-4 text-zinc-900 dark:text-zinc-100">
      <div className="grid justify-items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] bg-[size:16px_16px] px-4 pt-7 pb-4.5 dark:border-zinc-800 dark:bg-zinc-900 dark:bg-[radial-gradient(#27272a_1px,transparent_1px)]">
        <div className="grid size-32 place-items-center rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)] dark:border-zinc-800 dark:bg-zinc-950">
          <Remold.Icon icon={BigIcon} className="size-[72px]" aria-hidden="true" />
        </div>
        <Remold.Text className="text-[15px] font-semibold">{bigName}</Remold.Text>
        <div role="group" aria-label="Morph the big icon into" className="mt-1.5 flex max-w-[620px] flex-wrap justify-center gap-1">
          {ALL.map(([name, Icon], i) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={big === i}
              onClick={() => {
                setTouched(true);
                setBig(i);
              }}
              className={`grid size-[34px] place-items-center rounded-[9px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900 ${focus}`}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
        {PAIRS.map(([a, b], i) => {
          const on = flipped[i]!;
          const [name, Icon] = on ? b : a;
          return (
            <button
              key={a[0]}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setTouched(true);
                setFlipped((f) => f.map((x, j) => (j === i ? !x : x)));
              }}
              className={`grid justify-items-center gap-2 rounded-[14px] border border-zinc-200 bg-zinc-50 px-2 pt-4.5 pb-3 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${focus}`}
            >
              <Remold.Icon icon={Icon} className="size-7" aria-hidden="true" />
              <Remold.Text className="text-xs text-zinc-500 dark:text-zinc-400">{name}</Remold.Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
