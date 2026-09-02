// Per-user profile photo, stored locally in the browser as a data URL.
//
// `profiles` (Supabase) has no avatar column and there is no storage bucket
// for avatars — display name goes through profiles.full_name (see
// state.tsx's updateDisplayName), but the photo has nowhere server-side to
// land yet. This mirrors bankinfo.ts, the existing precedent in this exact
// settings page for profile-adjacent data with no backing column: scoped by
// user email, local to this browser only.

const PROFILE_PHOTO_KEY = (email: string) =>
  `upshopee.profilephoto.${email.trim().toLowerCase()}`;

export function loadProfilePhoto(email: string | null | undefined): string | null {
  if (!email) return null;
  try {
    return localStorage.getItem(PROFILE_PHOTO_KEY(email));
  } catch {
    return null;
  }
}

export function saveProfilePhoto(email: string, dataUrl: string): void {
  try {
    localStorage.setItem(PROFILE_PHOTO_KEY(email), dataUrl);
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function removeProfilePhoto(email: string): void {
  try {
    localStorage.removeItem(PROFILE_PHOTO_KEY(email));
  } catch {
    // ignore storage failures
  }
}
