"use client";
import {useState} from "react";
import type {AppLanguage} from "@/lib/i18n";
import {THEME_COOKIE, type Theme} from "@/lib/theme";

export default function ThemeToggle({initialTheme, language}: {initialTheme: Theme; language: AppLanguage}) {
  const [theme, setTheme] = useState(initialTheme);
  const dark = theme === "dark", en = language === "en";
  const action = dark ? (en ? "Switch to light mode" : "Zum hellen Design wechseln") : (en ? "Switch to dark mode" : "Zum dunklen Design wechseln");

  function toggle() {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // The server reads the same preference before rendering the next page: no light flash.
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setTheme(next);
  }

  return <button type="button" className="themeToggle" onClick={toggle} aria-label={action} title={action}>
    <span className="themeGlyph" aria-hidden="true">{dark ? "☀" : "☾"}</span>
    <span>{dark ? (en ? "Light" : "Hell") : (en ? "Dark" : "Dunkel")}</span>
  </button>;
}
