"use client";
import {useEffect, useState} from "react";

export default function ErrorPage({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const [en, setEn] = useState(false);
  useEffect(() => setEn(document.documentElement.lang === "en"), []);
  return <section className="emptyState" role="alert">
    <h1>{en ? "This page could not be loaded" : "Diese Seite konnte nicht geladen werden"}</h1>
    <p>{en ? "Your saved career is still there. Try loading the page again." : "Deine gespeicherte Karriere bleibt erhalten. Versuche, die Seite erneut zu laden."}</p>
    <button onClick={reset}>{en ? "Try again" : "Erneut versuchen"}</button>
  </section>;
}
