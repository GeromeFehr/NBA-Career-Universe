import Link from "next/link";
import type {AppLanguage} from "@/lib/i18n";

export default function MediaNavigation({language, current}: {language: AppLanguage; current: "news" | "social" | "press"}) {
  const en = language === "en";
  const links = [
    {id: "news", href: "/media", title: en ? "Reports" : "Berichte"},
    {id: "social", href: "/social", title: "Social"},
    {id: "press", href: "/interviews", title: en ? "Press conferences" : "Pressekonferenzen"},
  ];
  return <nav className="sectionNav" aria-label={en ? "Media sections" : "Medienbereiche"}>
    {links.map(link => <Link key={link.id} href={link.href} aria-current={current === link.id ? "page" : undefined}>{link.title}</Link>)}
  </nav>;
}
