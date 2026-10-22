/**
 * Real podcast episodes for the docs' player demo, from the iTunes Search API: the newest episodes
 * about design, one per show, with artwork, length and the audio file. Cached for six hours.
 */
export const revalidate = 21600;

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

export async function GET() {
  try {
    const res = await fetch("https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&term=design&limit=60&country=gb", {
      next: { revalidate },
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
        summary: (r.shortDescription || r.description || "").replace(/\s+/g, " ").trim().slice(0, 400),
      });
      if (episodes.length === 8) break;
    }
    return Response.json({ episodes, source: "Apple Podcasts" });
  } catch {
    return Response.json({ episodes: [], source: null }, { status: 502 });
  }
}
