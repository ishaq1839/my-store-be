import { listUsersByCreatedAt, searchUsersByTrigrams, type PublicUser, type UserRecord } from "../../../database/repos/users.repo";
import { pickQueryTrigrams, scoreUserForQuery, normalizeSpaces } from "./searchTokens";

export type AdminListUsersInput = {
  search?: string;
  limit: number;
  cursor?: string;
};

export type AdminListUsersResponse = {
  users: PublicUser[];
  next_cursor: string | null;
};

function encodeCursor(c: { created_at: string; uuid: string }): string {
  return Buffer.from(`${c.created_at}|${c.uuid}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { created_at: string; uuid: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [created_at, uuid] = raw.split("|");
    if (!created_at || !uuid) return null;
    return { created_at, uuid };
  } catch {
    return null;
  }
}

function toPublicUserFromRecord(u: UserRecord): PublicUser {
  return {
    uuid: String(u.uuid),
    email: String(u.email),
    role: String(u.role || "user"),
    firstname: String(u.firstname || ""),
    lastname: String(u.lastname || ""),
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function adminListUsers(input: AdminListUsersInput): Promise<AdminListUsersResponse> {
  const limit = input.limit;
  const search = normalizeSpaces(String(input.search || ""));

  if (!search) {
    const cursor = decodeCursor(String(input.cursor || ""));
    const res = await listUsersByCreatedAt({ limit, cursor });
    return {
      users: res.users,
      next_cursor: res.next_cursor ? encodeCursor(res.next_cursor) : null,
    };
  }

  const queryTrigrams = pickQueryTrigrams(search);
  const candidates = await searchUsersByTrigrams(queryTrigrams, 50);

  const scored = candidates
    .map((u) => ({
      u,
      score: scoreUserForQuery(
        { email_lower: u.email_lower, full_name_lower: u.full_name_lower, search_trigrams: u.search_trigrams },
        search,
        queryTrigrams
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => toPublicUserFromRecord(x.u));

  return { users: scored, next_cursor: null };
}

