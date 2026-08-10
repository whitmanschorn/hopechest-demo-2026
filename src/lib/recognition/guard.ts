// /api/recognition/debug/* TRUNCATE and seed the recognition tables, so this
// surface used to be hidden behind an env flag. The whole deployment now sits
// behind Vercel Authentication (no anonymous access), so the gate is redundant
// and we leave the debug page + endpoints reachable. The blast radius is still
// limited to the isolated face_* tables.

export function debugEnabled(): boolean {
  return true;
}
