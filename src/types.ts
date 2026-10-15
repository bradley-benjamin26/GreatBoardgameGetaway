import type Database from "better-sqlite3";

export type Db = Database.Database;

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export type CatalogHit = { bggId: number; title: string; year?: number };
export type CatalogGame = {
  bggId: number;
  title: string;
  minPlayers: number;
  maxPlayers: number;
  playMinutes: number;
  imageUrl?: string;
};
export interface Catalog {
  search(query: string): Promise<CatalogHit[]>;
  getGame(bggId: number): Promise<CatalogGame>;
}

export class CatalogUnavailable extends Error {
  constructor() {
    super("The game catalog is unavailable");
  }
}

/** An error that is safe to show to the user, with the HTTP status to use. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
