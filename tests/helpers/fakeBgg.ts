import {
  CatalogUnavailable,
  type Catalog,
  type CatalogGame,
  type CatalogHit,
} from "../../src/types.js";

export class FakeBgg implements Catalog {
  down = false;
  hits: CatalogHit[] = [{ bggId: 13, title: "Catan", year: 1995 }];
  games = new Map<number, CatalogGame>([
    [
      13,
      {
        bggId: 13,
        title: "Catan",
        minPlayers: 3,
        maxPlayers: 4,
        playMinutes: 90,
        imageUrl: "https://example.com/catan.jpg",
      },
    ],
  ]);
  async search(q: string) {
    if (this.down) throw new CatalogUnavailable();
    return this.hits.filter((h) => h.title.toLowerCase().includes(q.toLowerCase()));
  }
  async getGame(id: number) {
    if (this.down) throw new CatalogUnavailable();
    const g = this.games.get(id);
    if (!g) throw new CatalogUnavailable();
    return g;
  }
}
