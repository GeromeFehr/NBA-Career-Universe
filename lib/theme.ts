export type Theme = "light" | "dark";
export const THEME_COOKIE = "nba_theme";

export function readTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}
