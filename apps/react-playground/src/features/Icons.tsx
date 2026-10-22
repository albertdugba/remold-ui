/**
 * Icons that change state by reshaping. `<Remold.Icon>` pairs each stroke of the old icon
 * with the nearest stroke of the new one; leftovers merge into a neighbour or grow out of one.
 */
import { springs, Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import type { IconName } from "../icons";
import { useMotion, useRun } from "../motion";
import { MorphIcon, StaticIcon } from "../ui/MorphIcon";

/* Toggles: eight common two-state icons. */

const TOGGLES: { off: IconName; on: IconName; offLabel: string; onLabel: string }[] = [
  { off: "play", on: "pause", offLabel: "Play", onLabel: "Pause" },
  { off: "menu", on: "close", offLabel: "Menu", onLabel: "Close" },
  { off: "mic", on: "micOff", offLabel: "Mute", onLabel: "Unmute" },
  { off: "copy", on: "check", offLabel: "Copy", onLabel: "Copied" },
  { off: "plus", on: "minus", offLabel: "Expand", onLabel: "Collapse" },
  { off: "bell", on: "bellOff", offLabel: "Silence", onLabel: "Notify" },
  { off: "sun", on: "moon", offLabel: "Dark", onLabel: "Light" },
  { off: "chevronRight", on: "chevronDown", offLabel: "Open", onLabel: "Fold" },
];

function TogglesDemo({ autoplay }: DemoProps) {
  const [on, setOn] = useState<boolean[]>(() => TOGGLES.map(() => false));
  const flip = (i: number) => setOn((all) => all.map((v, j) => (j === i ? !v : v)));
  // Flip them in turn: all on, then all off again.
  useAutoplay(autoplay, 650, (count) => flip(count % TOGGLES.length));

  return (
    <div className="demo-panel">
      <div className="toggle-grid">
        {TOGGLES.map((t, i) => (
          <button key={t.off} type="button" className="icon-toggle" aria-pressed={on[i]} onClick={() => flip(i)}>
            <MorphIcon name={on[i] ? t.on : t.off} />
            <span>{on[i] ? t.onLabel : t.offLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const toggles: Example = {
  id: "icon-toggles",
  category: "Icons",
  title: "Toggle icons",
  summary: "Play and pause, menu and close, sun and moon: two-state icons that reshape instead of swapping.",
  headline: (
    <>
      Two states,
      <br />
      one shape.
    </>
  ),
  lead: "The icons every app has, each drawn as a single path. Pressing one doesn't swap the picture: its strokes travel to where the other state needs them, so the change reads as one movement.",
  tries: [
    "Press Menu: the three lines become the two strokes of a cross, the middle one merging away.",
    "Press Dark: the sun's rays fold into the moon's crescent.",
    "Press several quickly. Every morph starts from the shape on screen.",
  ],
  code: `
<button aria-pressed={open} onClick={() => setOpen(!open)}>
  <Remold.Icon d={open ? icons.close : icons.menu} />
</button>
`,
  uses: [{ name: "Remold.Icon", role: "Morphs each button's icon between its two states." }],
  frame: "panel",
  Demo: TogglesDemo,
};

/* Buttons that report progress: idle, working, done or failed. */

interface Step {
  icon: IconName;
  label: string;
  tone?: "busy" | "done" | "error";
}

const UPLOAD: Step[] = [
  { icon: "upload", label: "Upload files" },
  { icon: "dots", label: "Uploading 3 files", tone: "busy" },
  { icon: "check", label: "Uploaded", tone: "done" },
  { icon: "alert", label: "Try again", tone: "error" },
];
const FOLLOW: Step[] = [
  { icon: "userPlus", label: "Follow" },
  { icon: "userCheck", label: "Following", tone: "done" },
];
const COPY: Step[] = [
  { icon: "copy", label: "Copy link" },
  { icon: "check", label: "Link copied", tone: "done" },
];

function StatusButton({ step, onClick, disabled }: { step: Step; onClick: () => void; disabled?: boolean }) {
  const { loop, reducedMotion } = useMotion();
  return (
    <button type="button" className="status-button" data-tone={step.tone} onClick={onClick} disabled={disabled}>
      <MorphIcon name={step.icon} spring={springs.snappy} />
      <Remold.Text loop={loop} reducedMotion={reducedMotion}>
        {step.label}
      </Remold.Text>
    </button>
  );
}

function ButtonsDemo({ autoplay }: DemoProps) {
  const { wait } = useMotion();
  const nextRun = useRun();
  const [upload, setUpload] = useState(0);
  const [failNext, setFailNext] = useState(false);
  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = upload === 1;

  const startUpload = async () => {
    const signal = nextRun();
    setUpload(1);
    if (!(await wait(1500, signal))) return;
    setUpload(failNext ? 3 : 2);
    setFailNext((f) => !f);
    if (!(await wait(1800, signal))) return;
    setUpload(0);
  };
  const copy = async () => {
    setCopied(true);
    await wait(1600);
    setCopied(false);
  };

  useAutoplay(autoplay, 1700, (count) => {
    const beat = count % 4;
    if (beat === 0) void startUpload();
    else if (beat === 1) setFollowing((f) => !f);
    else if (beat === 2) void copy();
  });

  return (
    <div className="demo-panel">
      <div className="status-buttons" aria-live="polite">
        <StatusButton step={UPLOAD[upload]!} onClick={() => void startUpload()} disabled={busy} />
        <StatusButton step={FOLLOW[following ? 1 : 0]!} onClick={() => setFollowing((f) => !f)} />
        <StatusButton step={COPY[copied ? 1 : 0]!} onClick={() => void copy()} />
      </div>
    </div>
  );
}

export const buttons: Example = {
  id: "button-states",
  category: "Icons",
  title: "Button states",
  summary: "Upload, follow and copy buttons whose icon and label change together as the work happens.",
  headline: (
    <>
      Buttons that say
      <br />
      what they're doing.
    </>
  ),
  lead: "A button's icon and label are the best place to show progress. Here the arrow folds into three dots while the upload runs, then opens into a tick, or a warning if it failed, and the label changes in the same breath.",
  tries: [
    "Press Upload files twice: the first upload succeeds, the second fails and offers to try again.",
    "Press Follow: the plus on the person becomes a tick, and “Follow” grows into “Following”.",
    "Press Copy link. The squares fold into a tick, then come back.",
  ],
  code: `
<button onClick={upload}>
  <Remold.Icon d={icons[step.icon]} />
  <Remold.Text>{step.label}</Remold.Text>
</button>
`,
  uses: [
    { name: "Remold.Icon", role: "The button's icon, morphing between idle, working, done and failed." },
    { name: "Remold.Text", role: "The label, changing letter by letter with the icon." },
  ],
  frame: "panel",
  Demo: ButtonsDemo,
};

/* A weather widget: the big icon morphs between conditions. */

const FORECAST: { day: string; short: string; icon: IconName; temp: number; sky: string }[] = [
  { day: "Monday", short: "Mon", icon: "sun", temp: 24, sky: "Clear and bright" },
  { day: "Tuesday", short: "Tue", icon: "cloud", temp: 19, sky: "Cloudy" },
  { day: "Wednesday", short: "Wed", icon: "rain", temp: 16, sky: "Light rain" },
  { day: "Thursday", short: "Thu", icon: "storm", temp: 15, sky: "Thunderstorms" },
  { day: "Friday", short: "Fri", icon: "snow", temp: 2, sky: "Snow showers" },
];

function WeatherDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [index, setIndex] = useState(0);
  useAutoplay(autoplay, 1900, () => setIndex((i) => (i + 1) % FORECAST.length));
  const today = FORECAST[index]!;
  const text = { loop, reducedMotion };

  return (
    <div className="demo-panel">
      <div className="surface weather">
        <div className="weather-now">
          <MorphIcon className="weather-icon" name={today.icon} spring={springs.bouncy} label={today.sky} />
          <div>
            <p className="weather-place">Harbourside</p>
            <Remold.Text className="weather-temp" {...text}>
              {`${today.temp}°`}
            </Remold.Text>
            <Remold.Text className="weather-sky" {...text}>
              {`${today.day} · ${today.sky}`}
            </Remold.Text>
          </div>
        </div>
        <div className="weather-days" role="group" aria-label="Forecast">
          {FORECAST.map((f, i) => (
            <button key={f.day} type="button" aria-pressed={i === index} onClick={() => setIndex(i)} disabled={preview}>
              <span>{f.short}</span>
              <StaticIcon name={f.icon} />
              <span>{f.temp}°</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const weather: Example = {
  id: "weather",
  category: "Icons",
  title: "Weather widget",
  summary: "Sun, cloud, rain, storm and snow: the forecast icon reshapes from one condition to the next.",
  headline: (
    <>
      The sky changes.
      <br />
      So does the icon.
    </>
  ),
  lead: "Pick a day and the big icon becomes that day's weather. The cloud stays a cloud when rain arrives, and only the drops grow in; the sun's rays fold away into the cloud's outline.",
  tries: [
    "Go from Tuesday to Wednesday: the cloud lifts and the rain grows underneath it.",
    "Go from Wednesday to Thursday: the drops become a lightning bolt.",
    "Jump from Monday to Friday and back. Strokes travel the shortest way.",
  ],
  code: `
<Remold.Icon
  d={weatherIcons[day.condition]}
  spring={springs.bouncy}
  role="img"
  aria-label={day.sky}
/>
`,
  uses: [
    { name: "Remold.Icon", role: "The large forecast icon, morphing between conditions." },
    { name: "Remold.Text", role: "The temperature and the description." },
  ],
  frame: "panel",
  Demo: WeatherDemo,
};

/* Media controls: play and pause, repeat modes, and a volume icon that follows the slider. */

type Repeat = "off" | "all" | "one";

function MediaDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [volume, setVolume] = useState(60);
  useAutoplay(autoplay, 1300, (count) => {
    const beat = count % 7;
    if (beat === 0) setPlaying(true);
    else if (beat === 1) setVolume(25);
    else if (beat === 2) setVolume(0);
    else if (beat === 3) setVolume(70);
    else if (beat === 4) setRepeat("all");
    else if (beat === 5) setRepeat("one");
    else {
      setRepeat("off");
      setPlaying(false);
    }
  });
  const volumeIcon: IconName = volume === 0 ? "volumeMute" : volume < 45 ? "volumeLow" : "volumeHigh";

  return (
    <div className="demo-panel">
      <div className="surface media">
        <div className="media-track">
          <span className="media-art" aria-hidden="true" />
          <span>
            <span className="media-title">Low Tide</span>
            <Remold.Text className="media-artist" loop={loop} reducedMotion={reducedMotion}>
              {playing ? "Marlowe Bay · Playing" : "Marlowe Bay · Paused"}
            </Remold.Text>
          </span>
        </div>
        <div className="media-controls">
          <button type="button" aria-pressed={shuffle} aria-label="Shuffle" onClick={() => setShuffle((s) => !s)}>
            <StaticIcon name="shuffle" />
          </button>
          <button type="button" aria-label="Previous">
            <StaticIcon name="skipBack" />
          </button>
          <button type="button" className="media-play" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            <MorphIcon name={playing ? "pause" : "play"} />
          </button>
          <button type="button" aria-label="Next">
            <StaticIcon name="skipForward" />
          </button>
          <button
            type="button"
            aria-pressed={repeat !== "off"}
            aria-label={`Repeat: ${repeat}`}
            onClick={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
          >
            <MorphIcon name={repeat === "one" ? "repeatOne" : "repeat"} />
          </button>
        </div>
        <label className="media-volume">
          <MorphIcon name={volumeIcon} label={volume === 0 ? "Muted" : `Volume ${volume}%`} />
          <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
        </label>
      </div>
    </div>
  );
}

export const media: Example = {
  id: "media-controls",
  category: "Icons",
  title: "Media controls",
  summary: "Play becomes pause, repeat gains a 1, and the speaker's sound waves grow and shrink with the volume.",
  headline: (
    <>
      Controls that
      <br />
      answer back.
    </>
  ),
  lead: "A player's controls say what will happen when you press them. Here they change shape as the state changes: the triangle splits into two bars, repeat gains a small 1 for a single track, and the speaker gains or loses sound waves as you drag the volume.",
  tries: [
    "Press play and pause: the triangle splits into two bars and joins back up.",
    "Drag the volume to the bottom and back: the waves fold away into a cross, then grow back one at a time.",
    "Press repeat twice: the second press adds the 1.",
  ],
  code: `
<Remold.Icon d={playing ? icons.pause : icons.play} />
<Remold.Icon
  d={volume === 0 ? icons.mute : volume < 45 ? icons.low : icons.high}
/>
`,
  uses: [
    { name: "Remold.Icon", role: "Play and pause, repeat and repeat-one, and the three volume levels." },
    { name: "Remold.Text", role: "The playing or paused line under the title." },
  ],
  frame: "panel",
  Demo: MediaDemo,
};

/* App navigation: the leading icon changes with where you are. */

const SCREENS = {
  inbox: { lead: "menu", trail: "compose", title: "Inbox", leadLabel: "Open menu", trailLabel: "Write a message" },
  thread: { lead: "arrowLeft", trail: "more", title: "Launch plan", leadLabel: "Back to inbox", trailLabel: "More" },
  search: { lead: "close", trail: "search", title: "Search mail", leadLabel: "Close search", trailLabel: "Search" },
} as const satisfies Record<string, { lead: IconName; trail: IconName; title: string; leadLabel: string; trailLabel: string }>;
type Screen = keyof typeof SCREENS;

const MAIL = [
  { from: "Priya", subject: "Launch plan", preview: "Here's the order of the day…" },
  { from: "Design team", subject: "Review at 2", preview: "Bring the new onboarding flow" },
  { from: "Ola", subject: "Photos from Saturday", preview: "The good ones are at the end" },
];

function NavigationDemo({ autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [screen, setScreen] = useState<Screen>("inbox");
  useAutoplay(autoplay, 1700, () => setScreen((s) => (s === "inbox" ? "thread" : s === "thread" ? "search" : "inbox")));
  const now = SCREENS[screen];
  return (
    <div className="demo-panel">
      <div className="surface mail">
        <div className="mail-bar">
          <button type="button" aria-label={now.leadLabel} onClick={() => setScreen("inbox")}>
            <MorphIcon name={now.lead} />
          </button>
          <Remold.Text className="mail-title" loop={loop} reducedMotion={reducedMotion}>
            {now.title}
          </Remold.Text>
          <button type="button" aria-label={now.trailLabel} onClick={() => setScreen(screen === "search" ? "inbox" : "search")}>
            <MorphIcon name={now.trail} />
          </button>
        </div>
        <ul className="mail-list">
          {MAIL.map((m) => (
            <li key={m.subject}>
              <button type="button" onClick={() => setScreen("thread")}>
                <strong>{m.from}</strong>
                <span>{m.subject}</span>
                <small>{m.preview}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const navigation: Example = {
  id: "navigation",
  category: "Icons",
  title: "Navigation bar",
  summary: "The menu icon becomes a back arrow inside a message and a close cross in search, while the title follows.",
  headline: (
    <>
      The bar knows
      <br />
      where you are.
    </>
  ),
  lead: "In an app bar the same two buttons do different jobs on different screens. Instead of swapping icons, they reshape: the menu's lines fold into a back arrow when you open a message, and into a cross when you search. The title changes letter by letter with them.",
  tries: [
    "Open a message: the menu folds into a back arrow and “Inbox” becomes “Launch plan”.",
    "Press the search icon: the leading icon becomes a cross and the pen becomes a magnifier.",
    "Press the cross to go back to the inbox.",
  ],
  code: `
<Remold.Icon d={icons[screen.leading]} />
<Remold.Text>{screen.title}</Remold.Text>
<Remold.Icon d={icons[screen.trailing]} />
`,
  uses: [
    { name: "Remold.Icon", role: "Both bar buttons: menu, back and close; compose, more and search." },
    { name: "Remold.Text", role: "The screen title." },
  ],
  frame: "panel",
  Demo: NavigationDemo,
};
