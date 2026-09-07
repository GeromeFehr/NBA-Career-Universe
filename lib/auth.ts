import { cookies } from "next/headers";

export async function isAdmin() {
  const store = await cookies();
  const token = store.get("career_session")?.value;
  return Boolean(token && process.env.SESSION_TOKEN && token === process.env.SESSION_TOKEN);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}
