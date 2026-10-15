import { describe, expect, it, vi } from "vitest";
import { createBgg } from "../../src/services/bgg.js";
import { CatalogUnavailable } from "../../src/types.js";

const searchXml = `<?xml version="1.0"?><items total="2"><item type="boardgame" id="13"><name type="primary" value="Catan"/><yearpublished value="1995"/></item><item type="boardgame" id="99"><name type="primary" value="Catan Junior"/></item></items>`;
const thingXml = `<?xml version="1.0"?><items><item type="boardgame" id="13"><thumbnail>https://cf.geekdo-images.com/t.jpg</thumbnail><name type="primary" value="Catan"/><name type="alternate" value="Siedler"/><minplayers value="3"/><maxplayers value="4"/><playingtime value="90"/></item></items>`;

function setup(responses: (Response | Error)[], token: string | undefined = "T") {
  const calls: { url: string; init: RequestInit }[] = [];
  const sleeps: number[] = [];
  const queue = [...responses];
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = queue.shift()!;
    if (r instanceof Error) throw r;
    return r;
  });
  const bgg = createBgg({
    token,
    fetch: fetchFn as unknown as typeof fetch,
    sleep: async (ms) => void sleeps.push(ms),
    now: () => 0,
  });
  return { bgg, calls, sleeps, fetchFn };
}
const ok = (xml: string) => new Response(xml, { status: 200 });

describe("bgg adapter", () => {
  it("parses search results and calls the right URL with the bearer token", async () => {
    const { bgg, calls } = setup([ok(searchXml)]);
    const hits = await bgg.search("catan");
    expect(hits).toEqual([
      { bggId: 13, title: "Catan", year: 1995 },
      { bggId: 99, title: "Catan Junior", year: undefined },
    ]);
    expect(calls[0].url).toBe(
      "https://boardgamegeek.com/xmlapi2/search?query=catan&type=boardgame",
    );
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer T");
    expect(new URL(calls[0].url).host).toBe("boardgamegeek.com");
    expect(calls[0].init.signal).toBeDefined();
  });

  it("parses a game using the primary name", async () => {
    const { bgg, calls } = setup([ok(thingXml)]);
    expect(await bgg.getGame(13)).toEqual({
      bggId: 13,
      title: "Catan",
      minPlayers: 3,
      maxPlayers: 4,
      playMinutes: 90,
      imageUrl: "https://cf.geekdo-images.com/t.jpg",
    });
    expect(calls[0].url).toBe("https://boardgamegeek.com/xmlapi2/thing?id=13");
  });

  it("waits so requests are at least 1 second apart", async () => {
    const { bgg, sleeps } = setup([ok(searchXml), ok(searchXml)]);
    await bgg.search("a");
    await bgg.search("b");
    expect(sleeps).toEqual([1000]);
  });

  it("retries once on HTTP 202 then succeeds", async () => {
    const { bgg, fetchFn } = setup([new Response("", { status: 202 }), ok(thingXml)]);
    expect((await bgg.getGame(13)).title).toBe("Catan");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("gives up after a second 202", async () => {
    const { bgg } = setup([new Response("", { status: 202 }), new Response("", { status: 202 })]);
    await expect(bgg.getGame(13)).rejects.toBeInstanceOf(CatalogUnavailable);
  });

  it.each([401, 429, 500])("throws CatalogUnavailable on HTTP %i", async (status) => {
    const { bgg } = setup([new Response("", { status })]);
    await expect(bgg.search("x")).rejects.toBeInstanceOf(CatalogUnavailable);
  });

  it("throws CatalogUnavailable on timeout", async () => {
    const { bgg } = setup([new DOMException("timeout", "TimeoutError")]);
    await expect(bgg.search("x")).rejects.toBeInstanceOf(CatalogUnavailable);
  });

  it("throws CatalogUnavailable without calling BGG when there is no token", async () => {
    const { bgg, fetchFn } = setup([], "");
    await expect(bgg.search("x")).rejects.toBeInstanceOf(CatalogUnavailable);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws CatalogUnavailable on a game with no data", async () => {
    const { bgg } = setup([ok(`<items></items>`)]);
    await expect(bgg.getGame(1)).rejects.toBeInstanceOf(CatalogUnavailable);
  });
});
