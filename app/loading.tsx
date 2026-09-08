import {cookies} from "next/headers";
export default async function Loading() {
  const en = (await cookies()).get("nba_ui_language")?.value === "en";
  return <div className="statusMessage" role="status" aria-live="polite">{en ? "Loading your career…" : "Deine Karriere wird geladen…"}</div>;
}
