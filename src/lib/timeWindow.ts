const SP_TZ = "America/Sao_Paulo";

/**
 * Milliseconds since the Unix epoch, reinterpreted so that dividing by a
 * window size aligns boundaries to round America/Sao_Paulo local hours —
 * regardless of the browser's own system timezone. Reading the local
 * calendar/time fields off a Date built from an SP-formatted string always
 * yields true SP wall-clock digits, so reconstructing the value via
 * Date.UTC + those digits stays correct for any visitor's device timezone
 * (unlike flooring the round-tripped Date's own getTime(), which only
 * happens to align for some browser timezones).
 */
function spEquivalentNow(at: number = Date.now()): number {
  const sp = new Date(new Date(at).toLocaleString("en-US", { timeZone: SP_TZ }));
  const dayStart = Date.UTC(sp.getFullYear(), sp.getMonth(), sp.getDate());
  const msIntoDay =
    sp.getHours() * 3_600_000 +
    sp.getMinutes() * 60_000 +
    sp.getSeconds() * 1_000 +
    sp.getMilliseconds();
  return dayStart + msIntoDay;
}

/**
 * Index of the current time window: stable within the window, incrementing
 * exactly at America/Sao_Paulo local boundaries (e.g. 00:00/06:00/12:00/18:00
 * for a 6h window, local midnight for a 24h window).
 */
export function spWindowIndex(windowMs: number, at?: number): number {
  return Math.floor(spEquivalentNow(at) / windowMs);
}

/** Milliseconds remaining until the current window rolls over. */
export function msUntilNextSpWindow(windowMs: number, at?: number): number {
  const now = spEquivalentNow(at);
  return (windowMs - (now % windowMs)) % windowMs;
}

/**
 * Today's calendar date in America/Sao_Paulo as `YYYY-MM-DD`.
 *
 * Same reason the rest of this module exists: `new Date().toISOString()` and
 * `toLocaleDateString()` both answer in the *visitor's* timezone, so a browser
 * in Tokyo or Lisbon would call it a different day than São Paulo does. The
 * /painel date selector and the `record_date` column of the panel tables are
 * both SP calendar dates, so the "today" they compare against has to be too.
 *
 * Built from formatToParts instead of a locale that happens to print
 * ISO order (en-CA), so the output does not depend on the ICU data shipped
 * with the browser.
 */
const SP_DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: SP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function spDateKey(at: number = Date.now()): string {
  const parts = SP_DATE_PARTS.formatToParts(new Date(at));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Real epoch ms of a given America/Sao_Paulo wall-clock moment (month is
 * 1-indexed, unlike Date.UTC). Use this — never a bare `new Date(...)`
 * comparison — for any "this stops being true after <SP date/time>" cutoff:
 * `new Date("2026-09-07")` parses as UTC midnight, which is a different
 * instant than SP midnight, so a visitor in another timezone would see the
 * cutoff fire at the wrong moment.
 *
 * `spEquivalentNow(at)` reads the SP wall-clock digits at real instant `at`
 * and re-encodes them as if they were UTC — a fixed, currently-constant
 * shift (SP has had no DST since 2019). Feeding it our own `target` gives
 * back that shift directly, without hardcoding the "-03:00" offset: at a
 * true SP instant, `target - spEquivalentNow(target)` collapses to exactly
 * that shift, so adding it back to `target` recovers the real epoch ms.
 */
export function spInstantMs(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = target - spEquivalentNow(target);
  return target + offsetMs;
}
