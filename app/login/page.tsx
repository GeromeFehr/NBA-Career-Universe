import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page({ searchParams }:{ searchParams:Promise<{error?:string;message?:string}> }) {
  if (await currentUser()) redirect("/universes");
  const q = await searchParams;

  return <div className="login">
    <span className="eyebrow">NBA CAREER UNIVERSE</span>
    <h1>Anmelden</h1>
    <p className="muted">Jeder Account hat seine eigenen, voneinander getrennten MyNBA-Karrieren.</p>
    {q.error && <p className="loginError">E-Mail oder Passwort ist nicht korrekt.</p>}
    {q.message === "confirm" && <p className="notice">Account erstellt. Falls E-Mail-Bestätigung aktiv ist, bestätige zuerst den Link aus deiner Mail.</p>}
    <form action="/api/auth/login" method="post">
      <label>E-Mail<input name="email" type="email" autoComplete="email" required autoFocus/></label>
      <label>Passwort<input name="password" type="password" autoComplete="current-password" required/></label>
      <button>Anmelden</button>
    </form>
    <p className="muted">Noch kein Account? <Link href="/register">Jetzt registrieren →</Link></p>
  </div>;
}
