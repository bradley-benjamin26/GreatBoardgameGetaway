export type Window = { from: number; to: number };

/** A session as minutes since the epoch, so one that runs past midnight compares correctly with the next day's. */
export function windowOf(day: string, startMinute: number, lengthMinutes: number): Window {
  const from = Date.parse(`${day}T00:00:00Z`) / 60000 + startMinute;
  return { from, to: from + lengthMinutes };
}

export const overlaps = (a: Window, b: Window) => a.from < b.to && b.from < a.to;

export const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
