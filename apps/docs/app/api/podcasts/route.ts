/**
 * Real podcast episodes for the docs' player demo, from the iTunes Search API: the newest episodes
 * about software engineering, one per show, with artwork, length and the audio file. Cached for six hours.
 */
export const dynamic = "force-static";

interface Result {
  trackId: number;
  trackName: string;
  collectionName: string;
  artworkUrl600?: string;
  episodeUrl?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  shortDescription?: string;
  description?: string;
}

const SPONSORS = /^brought to you by\b.*? — /i;
const AD_CHOICES = /Learn more about your ad choices\.\s*Visit \S+/gi;

/** The episode's own words: no sponsor credits or ad notices, ending on a whole sentence or a whole word. */
function summarise(text: string): string {
  const clean = text.replace(/\s+/g, " ").replace(SPONSORS, "").replace(AD_CHOICES, "").trim().slice(0, 400);
  if (!clean || /[.!?…]["”’)]?$/.test(clean)) return clean;

  const sentences = clean.match(/^.*[.!?]["”’)]?(?=\s)/)?.[0] ?? "";
  if (sentences.length >= 120) return sentences;

  return clean.includes(" ") ? `${clean.replace(/\s+\S*$/, "")}…` : clean;
}

export async function GET() {
  try {
    const res = await fetch("https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&term=software+engineering&limit=60&country=gb", {
      cache: "force-cache",
    });
    const data = (await res.json()) as { results?: Result[] };
    const seen = new Set<string>();
    const episodes = [];
    for (const r of data.results ?? []) {
      if (!r.artworkUrl600 || !r.episodeUrl || seen.has(r.collectionName)) continue;
      seen.add(r.collectionName);
      episodes.push({
        id: String(r.trackId),
        show: r.collectionName,
        title: r.trackName.trim(),
        artwork: r.artworkUrl600,
        audio: r.episodeUrl,
        seconds: Math.round((r.trackTimeMillis ?? 0) / 1000),
        date: r.releaseDate ?? null,
        summary: summarise(r.description || r.shortDescription || ""),
      });
      if (episodes.length === 8) break;
    }
    return Response.json({ episodes, source: "Apple Podcasts" });
  } catch {
    return Response.json({ episodes: [], source: null }, { status: 502 });
  }
}
