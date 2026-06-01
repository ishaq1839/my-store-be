export function normalizeSpaces(v: string): string {
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildFullNameLower(firstname: string, lastname: string): string {
  return normalizeSpaces(`${firstname} ${lastname}`);
}

export function buildEmailLower(email: string): string {
  return String(email).trim().toLowerCase();
}

export function buildTrigrams(input: string, opts?: { maxTokens?: number }): string[] {
  const maxTokens = opts?.maxTokens ?? 150;
  const s = normalizeSpaces(input);
  if (!s) return [];

  const out = new Set<string>();
  const raw = s.replace(/\s/g, " ");

  for (let i = 0; i + 3 <= raw.length; i += 1) {
    const tri = raw.slice(i, i + 3);
    if (tri.includes("  ")) continue;
    out.add(tri);
    if (out.size >= maxTokens) break;
  }

  return Array.from(out);
}

export function pickQueryTrigrams(query: string): string[] {
  const s = normalizeSpaces(query);
  if (s.length < 2) return [];
  // Firestore array-contains-any max 10
  const tokens = buildTrigrams(s, { maxTokens: 30 });
  return tokens.slice(0, 10);
}

export function scoreUserForQuery(
  user: { email_lower?: string; full_name_lower?: string; search_trigrams?: string[] },
  query: string,
  queryTrigrams: string[]
): number {
  const q = normalizeSpaces(query);
  const email = user.email_lower || "";
  const name = user.full_name_lower || "";

  let score = 0;

  // Trigram overlap
  if (Array.isArray(user.search_trigrams) && queryTrigrams.length) {
    const set = new Set(user.search_trigrams);
    for (const t of queryTrigrams) if (set.has(t)) score += 2;
  }

  // Substring boosts
  if (q && email.includes(q)) score += 10;
  if (q && name.includes(q)) score += 10;

  // Prefix boosts
  if (q && email.startsWith(q)) score += 6;
  if (q && name.startsWith(q)) score += 6;

  return score;
}

