"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Airplane01Icon, AlertCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { LayoutGroup, motion } from "motion/react";
import {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  AuroraMark,
  FlightArc,
  MeridianMark,
  NorthwindMark,
} from "./demo-icons";
import { useScene } from "./use-scene";
import "./flight-booking.css";

export interface Airport {
  code: string;
  city: string;
}

const LHR: Airport = { code: "LHR", city: "London Heathrow" };
const JFK: Airport = { code: "JFK", city: "New York JFK" };

interface Airline {
  name: string;

  tint: string;

  mark: ComponentType<Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon">>;
}

const AURORA: Airline = {
  name: "Aurora",
  tint: "#5b5bd6",
  mark: AuroraMark,
};
const NORTHWIND: Airline = {
  name: "Northwind",
  tint: "#0e7c66",
  mark: NorthwindMark,
};
const MERIDIAN: Airline = {
  name: "Meridian",
  tint: "#c2410c",
  mark: MeridianMark,
};

interface Flight {
  airline: Airline;
  number: string;
  departs: string;
  arrives: string;

  nextDay?: boolean;
  duration: string;
  stops: string;
  price: string;
}

const FLIGHTS: Record<"out" | "back", Flight[]> = {
  out: [
    {
      airline: AURORA,
      number: "AU 117",
      departs: "08:40",
      arrives: "11:35",
      duration: "7h 55m",
      stops: "Nonstop",
      price: "£412",
    },
    {
      airline: NORTHWIND,
      number: "NW 22",
      departs: "11:15",
      arrives: "14:20",
      duration: "8h 05m",
      stops: "Nonstop",
      price: "£389",
    },
    {
      airline: MERIDIAN,
      number: "MR 908",
      departs: "13:50",
      arrives: "19:05",
      duration: "10h 15m",
      stops: "1 stop · DUB",
      price: "£298",
    },
  ],
  back: [
    {
      airline: AURORA,
      number: "AU 118",
      departs: "18:30",
      arrives: "06:35",
      nextDay: true,
      duration: "7h 05m",
      stops: "Nonstop",
      price: "£436",
    },
    {
      airline: NORTHWIND,
      number: "NW 23",
      departs: "21:10",
      arrives: "09:20",
      nextDay: true,
      duration: "7h 10m",
      stops: "Nonstop",
      price: "£402",
    },
    {
      airline: MERIDIAN,
      number: "MR 909",
      departs: "16:45",
      arrives: "07:55",
      nextDay: true,
      duration: "10h 10m",
      stops: "1 stop · DUB",
      price: "£315",
    },
  ],
};

const DATE = "Thu 14 Nov";

const SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.12 };

const SEATS = [
  ["12A", "12B", "12C", "12D", "12E", "12F"],
  ["13A", "13B", "13C", "13D", "13E", "13F"],
  ["14A", "14B", "14C", "14D", "14E", "14F"],
  ["15A", "15B", "15C", "15D", "15E", "15F"],
] as const;

function Mark({ airline, size }: { airline: Airline; size: number }) {
  const AirlineMark = airline.mark;
  return (
    <span
      className="fb-mark"
      style={{ width: size, height: size, background: airline.tint }}
      role="img"
      aria-label={airline.name}
    >
      <AirlineMark />
    </span>
  );
}

const QR = 25;
function Code({ seed }: { seed: string }) {
  const finders = [
    [0, 0],
    [QR - 7, 0],
    [0, QR - 7],
  ] as const;
  let d = "";
  for (const [x, y] of finders)
    d += `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${
      y + 2
    }h3v3h-3z`;
  let hash = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  for (let y = 0; y < QR; y++)
    for (let x = 0; x < QR; x++) {
      hash = (hash * 1103515245 + 12345) >>> 0;
      if (
        finders.some(
          ([fx, fy]) => x >= fx - 1 && x < fx + 8 && y >= fy - 1 && y < fy + 8,
        )
      )
        continue;
      if ((hash >>> 16) % 2 === 0) d += `M${x} ${y}h1v1h-1z`;
    }
  return (
    <svg
      className="fb-qr"
      viewBox={`0 0 ${QR} ${QR}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={d} fillRule="evenodd" />
    </svg>
  );
}

function Field({
  label,
  children,
  className,
  end,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  end?: boolean;
}) {
  return (
    <div className={`fb-field${end ? " end" : ""}`}>
      <dt>{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}

function Ticket({
  flight,
  from,
  to,
  screen,
  seat,
  pointed,
  onPick,
  onSeatPicker,
  onSeat,
}: {
  flight: Flight;
  from: Airport;
  to: Airport;
  screen: "alternatives" | "pass" | "seats";
  seat: string;
  pointed: boolean;
  onPick: () => void;
  onSeatPicker: () => void;
  onSeat: (seat: string) => void;
}) {
  const style = { "--fb-tint": flight.airline.tint } as CSSProperties;

  if (screen === "alternatives") {
    return (
      <motion.section
        layout
        layoutId={`flight-${flight.number}`}
        transition={{ type: "spring", duration: 0.42, bounce: 0.1 }}
        className="fb-ticket"
        style={style}
        data-pointed={pointed || undefined}
      >
        <div className="fb-face">
          <Mark airline={flight.airline} size={28} />
          <span className="fb-row-main">
            <span className="fb-row-times">
              <span className="fb-time">{flight.departs}</span>
              <span className="fb-time">{flight.arrives}</span>
              {flight.nextDay && <sup>+1</sup>}
            </span>
            <span className="fb-row-meta">
              <span className="fb-airline">{flight.airline.name}</span>
              <span className="fb-number">{flight.number}</span>
              <span className="fb-duration">{flight.duration}</span>
            </span>
          </span>
          <span className="fb-row-side">
            <strong className="fb-price">{flight.price}</strong>
            <span className="fb-stops">{flight.stops}</span>
          </span>
          <button
            type="button"
            className="fb-hit"
            aria-label={`${flight.airline.name} ${flight.number}, ${flight.departs} to ${flight.arrives}, ${flight.duration}, ${flight.stops}, ${flight.price}`}
            onClick={onPick}
          />
        </div>
      </motion.section>
    );
  }

  if (screen === "seats") {
    return (
      <motion.section
        layout
        layoutId={`flight-${flight.number}`}
        transition={{ type: "spring", duration: 0.42, bounce: 0.1 }}
        className="fb-ticket"
        data-open=""
        data-seats=""
        style={style}
        aria-label="Choose a seat"
      >
        <div className="fb-face">
          <header className="fb-pass-head">
            <button type="button" className="fb-back" onClick={onSeatPicker}>
              <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
              Pass
            </button>
            <span className="fb-seat-title">Choose a seat</span>
          </header>
          <div className="fb-seat-route">
            <span>{from.code}</span>
            <HugeiconsIcon icon={Airplane01Icon} aria-hidden="true" />
            <span>{to.code}</span>
          </div>
          <div className="fb-seat-map" role="grid" aria-label="Available seats">
            {SEATS.map((row) => (
              <div className="fb-seat-row" role="row" key={row[0]}>
                {row.map((number, index) => (
                  <button
                    type="button"
                    key={number}
                    role="gridcell"
                    aria-label={`Seat ${number}`}
                    aria-pressed={seat === number}
                    data-aisle={index === 3 ? "" : undefined}
                    className="fb-seat"
                    onClick={() => onSeat(number)}
                  >
                    {number.slice(-1)}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="fb-seat-note">
            Standard seats · Included with your fare
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      layout
      layoutId={`flight-${flight.number}`}
      transition={{ type: "spring", duration: 0.42, bounce: 0.1 }}
      className="fb-ticket"
      data-open=""
      style={style}
      aria-label={`Boarding pass, ${flight.airline.name} ${flight.number}, ${from.code} to ${to.code}`}
    >
      <div className="fb-face">
        <header className="fb-pass-head">
          <Mark airline={flight.airline} size={26} />
          <span className="fb-airline">{flight.airline.name}</span>
          <span className="fb-number">{flight.number}</span>
        </header>

        <div className="fb-route">
          <div className="fb-end">
            <strong className="fb-code">{from.code}</strong>
            <span className="fb-city">{from.city}</span>
            <span className="fb-time">{flight.departs}</span>
          </div>
          <div className="fb-path" aria-hidden="true">
            <FlightArc className="fb-arc" />
            <HugeiconsIcon icon={Airplane01Icon} className="fb-plane" />
            <span className="fb-duration">{flight.duration}</span>
          </div>
          <div className="fb-end right">
            <strong className="fb-code">{to.code}</strong>
            <span className="fb-city">{to.city}</span>
            <span className="fb-time">
              {flight.arrives}
              {flight.nextDay && <sup>+1</sup>}
            </span>
          </div>
        </div>

        <dl className="fb-fields">
          <Field label="Zone">3</Field>
          <Field label="Gate" className="fb-gate">
            B12
          </Field>
          <Field label="Seat" end>
            <button
              type="button"
              className="fb-seat-button"
              onClick={onSeatPicker}
              aria-label={`Change seat, currently ${seat}`}
            >
              {seat}
            </button>
          </Field>
          <Field label="Passenger">Ama Mensah</Field>
          <Field label="Class">Economy</Field>
          <Field label="Date" className="fb-date" end>
            {DATE}
          </Field>
        </dl>

        <div className="fb-stub">
          <Code seed={flight.number} />
          <span className="fb-scan">Scan at the gate</span>
        </div>
      </div>
    </motion.section>
  );
}

type BookingState = {
  screen: "alternatives" | "pass" | "seats";
  picked: number | null;
  pointed: number | null;
  seat: string;
};

const STEPS: readonly { ms: number; state: BookingState }[] = [
  {
    ms: 1800,
    state: { screen: "alternatives", picked: null, pointed: null, seat: "14C" },
  },
  {
    ms: 1300,
    state: { screen: "alternatives", picked: null, pointed: 1, seat: "14C" },
  },
  {
    ms: 2300,
    state: { screen: "pass", picked: 1, pointed: null, seat: "14C" },
  },
  {
    ms: 1700,
    state: { screen: "seats", picked: 1, pointed: null, seat: "14C" },
  },
  {
    ms: 1500,
    state: { screen: "pass", picked: 1, pointed: null, seat: "14D" },
  },
  {
    ms: 1500,
    state: { screen: "alternatives", picked: null, pointed: null, seat: "14C" },
  },
] as const;

interface FlightBookingDemoProps {
  playing?: boolean;
}

export function FlightBookingDemo({ playing }: FlightBookingDemoProps = {}) {
  const scene = useScene(STEPS, (step) => STEPS[step]!.state, playing);
  const { picked, pointed, screen, seat } = scene.state;
  const update = (
    next: BookingState | ((current: BookingState) => BookingState),
  ) => scene.take(next);
  const pick = (index: number) =>
    update({ ...scene.state, screen: "pass", picked: index, pointed: null });
  const back = () =>
    update({
      ...scene.state,
      screen: "alternatives",
      picked: null,
      pointed: null,
    });
  const showSeats = () => update({ ...scene.state, screen: "seats" });
  const pickSeat = (nextSeat: string) =>
    update({ ...scene.state, screen: "pass", seat: nextSeat });

  const from = LHR;
  const to = JFK;
  const flights = FLIGHTS.out;
  const flight = picked === null ? null : flights[picked]!;

  return (
    <div ref={scene.ref} className="fb not-prose" data-screen={screen}>
      <LayoutGroup id="flight-booking">
      <motion.div layout="position"
        className="fb-surface"
      >
        {flight ? (
          <div className="fb-pass-bar">
            <button type="button" className="fb-back" onClick={back}>
              <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
              Alternatives
            </button>
            <span className="fb-pass-label">Updated itinerary</span>
          </div>
        ) : (
          <>
            <section className="fb-disruption" aria-label="Flight delay">
              <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
              <span>
                <strong>AU 117 is delayed</strong>
                <small>Choose a new flight at no extra cost.</small>
              </span>
            </section>
            <div className="fb-trip">
              <span>{from.code}</span>
              <span className="fb-trip-line" aria-hidden="true" />
              <span>{to.code}</span>
              <time>{DATE}</time>
            </div>
            <p className="fb-heading">Available alternatives</p>
          </>
        )}
        <ul
          className="fb-results"
          aria-label={flight ? "Your flight" : "Flights"}
        >
          {flights.slice(0, 2).map((f, i) =>
            flight && f !== flight ? null : (
              <li key={f.number} className="fb-slot">
                <Ticket
                  flight={f}
                  from={from}
                  to={to}
                  screen={f === flight ? screen : "alternatives"}
                  seat={seat}
                  pointed={pointed === i}
                  onPick={() => pick(i)}
                  onSeatPicker={() =>
                    screen === "seats"
                      ? update({ ...scene.state, screen: "pass" })
                      : showSeats()
                  }
                  onSeat={pickSeat}
                />
              </li>
            ),
          )}
        </ul>
      </motion.div>
      </LayoutGroup>
    </div>
  );
}
