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
