"""Writes the README's hero graphic, light and dark, from one template.

The picture is what Remold does: a list re-sorts, and every row is followed from where it was to
where it went. Run from the repo root: python3 scripts/readme-hero.py
Outputs .github/assets/hero-light.svg and .github/assets/hero-dark.svg.
"""
import math
import random
from pathlib import Path

FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Inter, Helvetica, Arial, sans-serif"
MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace"

THEMES = {
    "light": dict(
        bg="#ffffff", dots="#e4e4e7", glow="#000000", glow_alpha="0.035", row="#ffffff", edge="#09090b1f",
        ink="#09090b", muted="#71717a", faint="#a1a1aa", accent="#09090b", accent2="#3f3f46", end="#71717a", bloom="0.12", trail=0.5, field=0.8, chip="#f4f4f5",
        kw="#09090b", str="#52525b", tag="#09090b", shadow="#09090b", shadow_alpha="0.07",
        # Each row's own grey, so its line can be told apart where the lines cross.
        shade=dict(Driftwood="#09090b", Apollo="#71717a", Cascade="#a1a1aa", Borealis="#3f3f46"),
    ),
    "dark": dict(
        bg="#09090b", dots="#222225", glow="#ffffff", glow_alpha="0.05", row="#141416", edge="#ffffff1a",
        ink="#fafafa", muted="#a1a1aa", faint="#52525b", accent="#ffffff", accent2="#d4d4d8", end="#71717a", bloom="0.28", trail=1.0, field=1.0, chip="#1c1c1f",
        kw="#fafafa", str="#a1a1aa", tag="#fafafa", shadow="#000000", shadow_alpha="0.55",
        shade=dict(Driftwood="#ffffff", Apollo="#a1a1aa", Cascade="#71717a", Borealis="#d4d4d8"),
    ),
}

MARK = "M7 23.5V8.5A1.5 1.5 0 0 1 8.5 7H14A11 11 0 0 1 25 18H18A4 4 0 0 0 14 14V23.5A1.5 1.5 0 0 1 12.5 25H8.5A1.5 1.5 0 0 1 7 23.5Z"

# The list: newest first on the left, A to Z on the right. Cascade doesn't move.
ROWS = {
    "Driftwood": dict(meta="2m"),
    "Apollo": dict(meta="1h"),
    "Cascade": dict(meta="3h"),
    "Borealis": dict(meta="1d"),
}
BEFORE = ["Driftwood", "Apollo", "Cascade", "Borealis"]
AFTER = sorted(BEFORE)

ROW_W, ROW_H, ROW_GAP = 176, 46, 14
LEFT_X, RIGHT_X = 676, 1024
TOP = 214


def row_y(i):
    return TOP + i * (ROW_H + ROW_GAP)


def row(x, y, name, t, *, faded=False):
    c = t["shade"][name]
    op = ' opacity="0.42"' if faded else ""
    return f"""
  <g{op}>
    <rect x="{x}" y="{y + 5}" width="{ROW_W}" height="{ROW_H}" rx="13" fill="{t['shadow']}" opacity="{t['shadow_alpha']}" filter="url(#soft)"/>
    <rect x="{x}" y="{y}" width="{ROW_W}" height="{ROW_H}" rx="13" fill="{t['row']}"/>
    <rect x="{x + 12}" y="{y + 13}" width="20" height="20" rx="6" fill="{c}" fill-opacity="0.18"/>
    <rect x="{x + 18}" y="{y + 19}" width="8" height="8" rx="2.5" fill="{c}"/>
    <text x="{x + 44}" y="{y + 28.5}" font-family="{FONT}" font-size="14.5" font-weight="560" fill="{t['ink']}">{name}</text>
    <text x="{x + ROW_W - 14}" y="{y + 28.5}" text-anchor="end" font-family="{MONO}" font-size="11.5" fill="{t['faint']}">{ROWS[name]['meta']}</text>
  </g>"""


def field(t):
    """Particles behind the sort: a loose cloud behind the old order streaming into a neat grid
    behind the new one. Each dot is caught at its own moment of the same morph, so the field shows
    both ends at once (the cloud, the grid) and the flow between them, like a long exposure."""
    rnd = random.Random(11)
    # Keep the labels and the line of code clear of dots.
    clear = [(650, 154, 1236, 190), (760, 480, 1120, 516)]
    out = []
    for gy in range(128, 471, 14):
        for gx in range(958, 1263, 14):
            # Spread wide enough to show round the old order, not only behind it.
            sx = min(965, max(600, rnd.gauss(764, 125)))
            sy = min(565, max(118, rnd.gauss(326, 150)))
            # Two in five still in the cloud, about as many settled in the grid, the rest on the way.
            roll = rnd.random()
            k = rnd.uniform(0, 0.12) if roll < 0.4 else rnd.uniform(0.92, 1) if roll < 0.82 else rnd.uniform(0.2, 0.85)
            e = k * k * (3 - 2 * k)
            drift = (1 - e) * e * 22
            x = sx + (gx - sx) * e + rnd.uniform(-drift, drift)
            y = sy + (gy - sy) * e + rnd.uniform(-drift, drift)
            if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in clear):
                continue
            out.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{0.85 + 1.05 * e:.2f}" fill="{t["ink"]}" opacity="{(0.12 + 0.38 * e) * t["field"]:.2f}"/>'
            )
    return "\n  ".join(out)


def panel(x, y, w, h, t, rx=16):
    """A floating card: a plain surface lifted off the page by its shadow, with no border."""
    return (
        f'<rect x="{x}" y="{y + 6}" width="{w}" height="{h}" rx="{rx}" fill="{t["shadow"]}" opacity="{t["shadow_alpha"]}" filter="url(#soft)"/>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{t["row"]}"/>'
    )


def on(fill):
    """Black or white text, whichever reads better on `fill`."""
    r, g, b = (int(fill[i : i + 2], 16) for i in (1, 3, 5))
    return "#09090b" if 0.299 * r + 0.587 * g + 0.114 * b > 140 else "#ffffff"


def fragments(t):
    """Other interface pieces floating round the sort: a metric card, a save button caught
    mid-change, and an avatar stack. Each is a change Remold follows."""
    out = []

    # A metric card, with this week's bar in full ink.
    x, y = 704, 36
    out.append(panel(x, y, 214, 96, t))
    out.append(f'<text x="{x + 18}" y="{y + 28}" font-family="{FONT}" font-size="12" fill="{t["muted"]}">Revenue</text>')
    out.append(f'<text x="{x + 18}" y="{y + 60}" font-family="{FONT}" font-size="25" font-weight="700" letter-spacing="-0.8" fill="{t["ink"]}">$48.2k</text>')
    out.append(f'<text x="{x + 18}" y="{y + 80}" font-family="{FONT}" font-size="11.5" font-weight="550" fill="{t["muted"]}">+12.4%</text>')
    bars = [38, 46, 41, 55, 50, 62, 58, 74]
    for i, b in enumerate(bars):
        h = b * 0.62
        last = i == len(bars) - 1
        out.append(
            f'<rect x="{x + 128 + i * 9.5:.1f}" y="{y + 80 - h:.1f}" width="6" height="{h:.1f}" rx="2" fill="{t["ink"]}" opacity="{1 if last else 0.16}"/>'
        )

    # A save button mid-change: the old state, faint, behind the new one.
    gx, gy = 1018, 52
    out.append(
        f'<g opacity="0.55"><rect x="{gx}" y="{gy}" width="118" height="38" rx="19" fill="none" stroke="{t["ink"]}" stroke-opacity="0.35" stroke-dasharray="4 4"/>'
        f'<path d="M{gx + 30} {gy + 19}a7 7 0 1 1-7-7" fill="none" stroke="{t["muted"]}" stroke-width="2" stroke-linecap="round"/>'
        f'<text x="{gx + 42}" y="{gy + 24}" font-family="{FONT}" font-size="14" font-weight="550" fill="{t["muted"]}">Saving</text></g>'
    )
    sx, sy = 1062, 78
    out.append(
        f'<rect x="{sx}" y="{sy + 6}" width="122" height="40" rx="20" fill="{t["shadow"]}" opacity="{float(t["shadow_alpha"]) * 1.6:.2f}" filter="url(#soft)"/>'
        f'<rect x="{sx}" y="{sy}" width="122" height="40" rx="20" fill="{t["ink"]}"/>'
        f'<path d="M{sx + 20} {sy + 20.5}l4.4 4.4 8.6-9" fill="none" stroke="{t["row"]}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<text x="{sx + 44}" y="{sy + 25.5}" font-family="{FONT}" font-size="15" font-weight="600" fill="{t["row"]}">Saved</text>'
    )

    # An avatar stack: four faces in greys, then the count.
    ax, ay = 612, 548
    out.append(panel(ax, ay, 232, 54, t, rx=27))
    greys = [t["shade"][n] for n in ("Driftwood", "Borealis", "Apollo", "Cascade")]
    for i, (ini, g) in reversed(list(enumerate(zip(["AO", "BH", "CP", "DR"], greys)))):
        cx = ax + 28 + i * 24
        out.append(
            f'<circle cx="{cx}" cy="{ay + 27}" r="16" fill="{t["row"]}"/><circle cx="{cx}" cy="{ay + 27}" r="14" fill="{g}"/>'
            f'<text x="{cx}" y="{ay + 31}" text-anchor="middle" font-family="{FONT}" font-size="10.5" font-weight="650" fill="{on(g)}">{ini}</text>'
        )
    cx = ax + 28 + 4 * 24
    out.append(
        f'<circle cx="{cx}" cy="{ay + 27}" r="16" fill="{t["row"]}"/><circle cx="{cx}" cy="{ay + 27}" r="14" fill="{t["chip"]}"/>'
        f'<text x="{cx}" y="{ay + 31}" text-anchor="middle" font-family="{FONT}" font-size="10.5" font-weight="650" fill="{t["muted"]}">+3</text>'
        f'<text x="{ax + 148}" y="{ay + 32}" font-family="{FONT}" font-size="13" font-weight="550" fill="{t["muted"]}">7 editing</text>'
    )
    return "\n  ".join(out)


def globe(t):
    """A dotted globe rising out of the bottom-right corner, with one arc and a light on it."""
    # Low in the corner, clear of the code line above it.
    cx, cy, R = 1262, 780, 300
    tilt = math.radians(24)
    spin = math.radians(-28)
    dots = []
    for lat in range(-84, 85, 6):
        ring = max(1, round(66 * math.cos(math.radians(lat))))
        for i in range(ring):
            lon = i * 360 / ring
            la, lo = math.radians(lat), math.radians(lon) + spin
            x = math.cos(la) * math.sin(lo)
            y = math.sin(la)
            z = math.cos(la) * math.cos(lo)
            # Tilt towards the viewer, so we look down on it a little.
            y, z = y * math.cos(tilt) - z * math.sin(tilt), y * math.sin(tilt) + z * math.cos(tilt)
            if z <= 0.02:
                continue
            px, py = cx + x * R, cy - y * R
            if py > 650 or px > 1290:
                continue
            dots.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{0.9 + 1.3 * z:.2f}" fill="{t["accent"]}" opacity="{0.16 + 0.6 * z:.2f}"/>')
    # One arc lifting off the surface between two cities, and a light partway along it.
    a, b = (cx - 150, cy - 168), (cx - 30, cy - 252)
    c = ((a[0] + b[0]) / 2 - 10, min(a[1], b[1]) - 70)
    arc = f'<path d="M{a[0]} {a[1]} Q {c[0]} {c[1]} {b[0]} {b[1]}" fill="none" stroke="{t["accent"]}" stroke-opacity="0.7" stroke-width="1.4" stroke-linecap="round"/>'
    k = 0.62
    lx = (1 - k) ** 2 * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0]
    ly = (1 - k) ** 2 * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]
    ends = "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="{t["accent"]}"/>' for x, y in (a, b))
    light = f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="7" fill="{t["accent"]}" opacity="0.5" filter="url(#bloom)"/><circle cx="{lx:.1f}" cy="{ly:.1f}" r="2.6" fill="#ffffff"/>'
    # A soft body and rim, so the dots read as a sphere.
    body = (
        f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#sphere)"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{t["accent"]}" stroke-opacity="0.28"/>'
    )
    return body + "\n  " + "\n  ".join(dots) + "\n  " + arc + ends + light


def build(t):
    p = []
    p.append(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640" role="img" aria-label="Remold: animated components for your UI, and the primitives to build your own. Change you can follow. A list sorted newest first is re-sorted A to Z, with a line following each row to where it went, over particles streaming from a loose cloud into a neat grid. Around it float a revenue card, a save button turning from Saving to Saved, an avatar stack, and a dotted globe.">
  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="{t['dots']}"/></pattern>
    <radialGradient id="glow" cx="74%" cy="44%" r="55%">
      <stop offset="0" stop-color="{t['glow']}" stop-opacity="{t['glow_alpha']}"/>
      <stop offset="1" stop-color="{t['glow']}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="veil" x1="0" x2="1">
      <stop offset="0" stop-color="{t['bg']}"/>
      <stop offset="0.5" stop-color="{t['bg']}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="{t['bg']}" stop-opacity="0.2"/>
    </linearGradient>
    <radialGradient id="sphere" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="{t['glow']}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="{t['glow']}" stop-opacity="0.02"/>
    </radialGradient>
    <linearGradient id="headline-fill" x1="76" x2="430" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{t['accent']}"/>
      <stop offset="0.62" stop-color="{t['accent2']}"/>
      <stop offset="1" stop-color="{t['end']}"/>
    </linearGradient>
    <filter id="headline-bloom" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="soft" x="-30%" y="-40%" width="160%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    <filter id="bloom" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id="frame"><rect width="1280" height="640" rx="28"/></clipPath>""")
    # One gradient per moving row, fading out towards the middle of its path and back in.
    for name in ROWS:
        c = t["shade"][name]
        p.append(f"""
    <linearGradient id="trace-{name}" x1="{LEFT_X + ROW_W}" x2="{RIGHT_X}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="{c}" stop-opacity="0.9"/>
      <stop offset="0.5" stop-color="{c}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="{c}" stop-opacity="0.9"/>
    </linearGradient>""")
    p.append(f"""
  </defs>
  <g clip-path="url(#frame)">
  <rect width="1280" height="640" fill="{t['bg']}"/>
  <rect width="1280" height="640" fill="url(#dots)"/>
  <rect width="1280" height="640" fill="url(#veil)"/>
  <rect width="1280" height="640" fill="url(#glow)"/>""")
    p.append("\n  " + globe(t))
    p.append("\n  " + field(t))
    p.append("\n  " + fragments(t))

    # Left: brand, headline with a motion trail on the word that changes, install line.
    p.append(f"""
  <g transform="translate(80 82) scale(1.55)"><path d="{MARK}" fill="{t['ink']}"/></g>
  <text x="139" y="116" font-family="{FONT}" font-size="29" font-weight="650" letter-spacing="-0.6" fill="{t['ink']}">remold<tspan fill="{t['faint']}" font-weight="500">/ui</tspan></text>
  <text x="80" y="200" font-family="{MONO}" font-size="12.5" letter-spacing="2.4" fill="{t['muted']}">ANIMATED COMPONENTS FOR YOUR UI</text>
  <g font-family="{FONT}" font-size="74" font-weight="700" letter-spacing="-3">
    <text x="76" y="282" fill="{t['ink']}">Change you</text>
  </g>
  <g font-family="{FONT}" font-size="74" font-weight="700" letter-spacing="-3">
    <!-- A bloom behind the words that move. -->
    <text x="76" y="364" fill="{t['accent']}" opacity="{t['bloom']}" filter="url(#headline-bloom)">can follow.</text>
    <!-- Its motion trail: outlines left behind as it slid in, fainter the further back. -->
    <text x="46" y="364" fill="none" stroke="{t['accent']}" stroke-width="1" opacity="{0.14 * t['trail']:.2f}">can follow.</text>
    <text x="56" y="364" fill="none" stroke="{t['accent']}" stroke-width="1" opacity="{0.26 * t['trail']:.2f}">can follow.</text>
    <text x="66" y="364" fill="none" stroke="{t['accent']}" stroke-width="1.1" opacity="{0.42 * t['trail']:.2f}">can follow.</text>
    <text x="76" y="364" fill="url(#headline-fill)">can follow.</text>
  </g>
  <g font-family="{FONT}" font-size="19" fill="{t['muted']}">
    <text x="80" y="428">Ready-made animated components, and the primitives</text>
    <text x="80" y="456">to build your own: layout, text, icons, canvas and particles.</text>
  </g>
  <text x="80" y="521" font-family="{MONO}" font-size="11.5" letter-spacing="1.4" fill="{t['faint']}">WORKS WITH</text>""")
    x = 178
    for name in ["React", "Vue", "Svelte", "Angular", "plain JS"]:
        w = 24 + len(name) * 8.2
        p.append(f"""
  <rect x="{x:.0f}" y="500" width="{w:.0f}" height="32" rx="16" fill="{t['chip']}"/>
  <text x="{x + w / 2:.0f}" y="521" text-anchor="middle" font-family="{FONT}" font-size="13.5" font-weight="500" fill="{t['muted']}">{name}</text>""")
        x += w + 8

    # Right: the two orders, and the state that changed between them.
    def state(x, value):
        return f"""
  <text x="{x}" y="176" font-family="{MONO}" font-size="13" fill="{t['muted']}">sort <tspan fill="{t['faint']}">=</tspan> <tspan fill="{t['str']}">"{value}"</tspan></text>"""

    p.append(state(LEFT_X + 2, "newest"))
    p.append(state(RIGHT_X + 2, "a–z"))
    p.append(f"""
  <path d="M{LEFT_X + ROW_W + 40} 171h{RIGHT_X - LEFT_X - ROW_W - 80}" stroke="{t['faint']}" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M{RIGHT_X - 46} 166l6 5-6 5" fill="none" stroke="{t['faint']}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>""")

    # The traces, drawn under the rows so each one tucks in behind its row's edge.
    x0, x1 = LEFT_X + ROW_W - 6, RIGHT_X + 6
    mid = (x0 + x1) / 2
    traces = {}
    for name in BEFORE:
        y0 = row_y(BEFORE.index(name)) + ROW_H / 2
        y1 = row_y(AFTER.index(name)) + ROW_H / 2
        d = f"M{x0} {y0} C {mid} {y0}, {mid} {y1}, {x1} {y1}"
        traces[name] = (d, y0, y1)
        width = 2.6 if name == "Driftwood" else 1.8
        p.append(f'\n  <path d="{d}" fill="none" stroke="url(#trace-{name})" stroke-width="{width}" stroke-linecap="round"/>')

    # The light on the row that travels furthest, part way along its path.
    d, y0, y1 = traces["Driftwood"]
    # A point on the curve itself, past where it crosses Cascade, so the two don't read as one.
    k = 0.74
    u = 1 - k
    tx = u**3 * x0 + 3 * u * u * k * mid + 3 * u * k * k * mid + k**3 * x1
    ty = y0 + (y1 - y0) * (3 * k * k - 2 * k**3)
    col = t["shade"]["Driftwood"]
    p.append(f"""
  <circle cx="{tx}" cy="{ty}" r="9" fill="{col}" opacity="0.55" filter="url(#bloom)"/>
  <circle cx="{tx}" cy="{ty}" r="3.6" fill="#ffffff"/>
  <circle cx="{tx}" cy="{ty}" r="3.6" fill="none" stroke="{col}" stroke-width="1.6"/>""")

    for i, name in enumerate(BEFORE):
        p.append(row(LEFT_X, row_y(i), name, t, faded=True))
    for i, name in enumerate(AFTER):
        p.append(row(RIGHT_X, row_y(i), name, t))

    # The one line that does it.
    cy = row_y(3) + ROW_H + 62
    p.append(f"""
  <text x="{(LEFT_X + RIGHT_X + ROW_W) / 2}" y="{cy}" text-anchor="middle" font-family="{MONO}" font-size="14.5" fill="{t['faint']}"><tspan fill="{t['tag']}">transition</tspan>(<tspan fill="{t['ink']}">list</tspan>, () =&gt; <tspan fill="{t['kw']}">render</tspan>(<tspan fill="{t['str']}">"a–z"</tspan>))</text>""")

    p.append("\n  </g>\n</svg>\n")
    return "".join(p)


out = Path(".github/assets")
out.mkdir(parents=True, exist_ok=True)
for name, theme in THEMES.items():
    (out / f"hero-{name}.svg").write_text(build(theme))
    print(f"wrote {out}/hero-{name}.svg")
