import { XMLParser } from "fast-xml-parser";
import { CatalogUnavailable, type Catalog, type CatalogGame, type CatalogHit } from "../types.js";

const BASE = "https://boardgamegeek.com/xmlapi2";

type Opts = {
  token?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "item" || name === "name",
});

type Node = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const val = (n: Node | undefined) => n?.["@_value"];
const title = (item: Node) => {
  const names: Node[] = item.name ?? [];
  return val(names.find((n) => n["@_type"] === "primary") ?? names[0]) as string | undefined;
};

export function createBgg(o: Opts): Catalog {
  const doFetch = o.fetch ?? fetch;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  let next = 0;

  async function throttle() {
    const t = now();
    const wait = Math.max(0, next - t);
    next = Math.max(t, next) + 1000;
    if (wait) await sleep(wait);
  }

  async function get(path: string): Promise<Node> {
    if (!o.token) throw new CatalogUnavailable();
    for (const attempt of [0, 1]) {
      await throttle();
      let res: Response;
      try {
        res = await doFetch(`${BASE}${path}`, {
          headers: { Authorization: `Bearer ${o.token}` },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        throw new CatalogUnavailable();
      }
      // BGG answers 202 while it prepares a response; wait once and ask again
      if (res.status === 202 && attempt === 0) {
        await sleep(2000);
        continue;
      }
      if (!res.ok || res.status === 202) throw new CatalogUnavailable();
      try {
        return parser.parse(await res.text());
      } catch {
        throw new CatalogUnavailable();
      }
    }
    throw new CatalogUnavailable();
  }

  return {
    async search(query: string): Promise<CatalogHit[]> {
      const doc = await get(`/search?query=${encodeURIComponent(query)}&type=boardgame`);
      const items: Node[] = doc.items?.item ?? [];
      return items.flatMap((i) => {
        const t = title(i);
        return t
          ? [
              {
                bggId: Number(i["@_id"]),
                title: t,
                year: val(i.yearpublished) ? Number(val(i.yearpublished)) : undefined,
              },
            ]
          : [];
      });
    },

    async getGame(bggId: number): Promise<CatalogGame> {
      const doc = await get(`/thing?id=${bggId}`);
      const item: Node | undefined = doc.items?.item?.[0];
      const t = item && title(item);
      if (!item || !t) throw new CatalogUnavailable();
      const min = Math.max(1, Number(val(item.minplayers)) || 1);
      const max = Math.max(min, Number(val(item.maxplayers)) || min);
      // shortcut: BGG sometimes has no play time; default to 60 minutes, edit by hand later if it matters
      const playMinutes = Number(val(item.playingtime)) || Number(val(item.maxplaytime)) || 60;
      const img =
        typeof item.thumbnail === "string" && item.thumbnail.startsWith("https://")
          ? item.thumbnail
          : undefined;
      return { bggId, title: t, minPlayers: min, maxPlayers: max, playMinutes, imageUrl: img };
    },
  };
}
