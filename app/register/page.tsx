import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page({ searchParams }:{ searchParams:Promise<{error?:string}> }) {
  if (await currentUser()) redirect("/universes");
  const q = await searchParams;

  return <div className="login">
    <span className="eyebrow">CREATE ACCOUNT</span>
    <h1>Dein NBA Universe</h1>
    <p className="muted">Ein Account kann mehrere komplett getrennte MyNBA-Karrieren verwalten.</p>
    {q.error === "password" && <p className="loginError">Das Passwort muss mindestens 8 Zeichen lang sein.</p>}
    {q.error === "signup" && <p className="loginError">Registrierung fehlgeschlagen. Prüfe E-Mail und Passwort.</p>}
    <form action="/api/auth/register" method="post">
      <label>Name optional<input name="displayName" autoComplete="name"/></label>
      <label>E-Mail<input name="email" type="email" autoComplete="email" required/></label>
      <label>Passwort<input name="password" type="password" minLength={8} autoComplete="new-password" required/></label>
      <button>Account erstellen</button>
    </form>
    <p className="muted">Schon registriert? <Link href="/login">Zum Login →</Link></p>
  </div>;
}
