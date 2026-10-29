/**
 * Kofi Kinaata songs for the home page's player, from the iTunes Search API: artwork and Apple's
 * official 30-second previews, in the same shape as the podcast episodes so the player takes either.
 * His best-known songs lead; the rest follow, newest first. Built once with the static site.
 */
export const dynamic = "force-static";

const ARTIST = "Kofi Kinaata";
/** Songs to lead with, if the catalogue has them. */
const FIRST = ["The Whole Show", "Things Fall Apart", "Susuka", "Have Mercy", "Time No Dey", "Made in Taadi", "Thy Grace"];
/** Apple's previews are 30 seconds long. */
const PREVIEW_SECONDS = 30;

interface Result {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  releaseDate?: string;
}

export async function GET() {
  try {
    const res = await fetch("https://itunes.apple.com/search?media=music&entity=song&term=kofi+kinaata&limit=50&country=gh", {
      cache: "force-cache",
    });
    const data = (await res.json()) as { results?: Result[] };
    const songs = (data.results ?? []).filter((r) => r.artistName === ARTIST && r.previewUrl && r.artworkUrl100);
    const rank = (r: Result) => {
      const i = FIRST.indexOf(r.trackName);
      return i === -1 ? FIRST.length : i;
    };
    songs.sort((a, b) => rank(a) - rank(b) || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    const episodes = songs.slice(0, 8).map((r) => ({
      id: String(r.trackId),
      show: r.artistName,
      title: r.trackName,
      // The search returns 100px artwork; the same image is served at any size by changing the name.
      artwork: r.artworkUrl100!.replace(/\/\d+x\d+bb\./, "/600x600bb."),
      audio: r.previewUrl,
      seconds: PREVIEW_SECONDS,
      date: r.releaseDate ?? null,
      summary: r.collectionName.replace(/ - Single$/, ""),
    }));
    return Response.json({ episodes, source: "Apple Music" });
  } catch {
    return Response.json({ episodes: [], source: null }, { status: 502 });
  }
}
