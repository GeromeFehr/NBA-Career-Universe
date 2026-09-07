import {NextResponse} from "next/server";
import {EVENT_LOGO_PAGES,TEAM_LOGO_PAGES} from "@/lib/logo-sources";

export const revalidate=604800;

function fallback(text:string){
  const safe=text.replace(/[^A-Z0-9 -]/gi,"").slice(0,12)||"NBA";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="28" fill="#151d2a"/><text x="80" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#fff">${safe}</text></svg>`;
  return new NextResponse(svg,{headers:{"content-type":"image/svg+xml","cache-control":"public,max-age=3600"}});
}

export async function GET(_:Request,{params}:{params:Promise<{kind:string;key:string}>}){
  const {kind,key}=await params;
  const code=key.toUpperCase();
  const page=kind==="team"?TEAM_LOGO_PAGES[code]:EVENT_LOGO_PAGES[code];
  if(!page)return fallback(code);

  try{
    const htmlRes=await fetch(page,{
      headers:{
        "user-agent":"Mozilla/5.0 NBA-Career-Universe/2.1",
        "accept":"text/html,application/xhtml+xml"
      },
      next:{revalidate:604800}
    });
    if(!htmlRes.ok)return fallback(code);
    const html=await htmlRes.text();

    const absolute=html.match(/https:\/\/(?:content\.)?sportslogos\.net\/[^"'<>\s]+?\.(?:png|webp|gif|jpe?g)/i)?.[0];
    const protocolRelative=html.match(/\/\/(?:content\.)?sportslogos\.net\/[^"'<>\s]+?\.(?:png|webp|gif|jpe?g)/i)?.[0];
    const imageUrl=(absolute|| (protocolRelative?`https:${protocolRelative}`:null))?.replace(/&amp;/g,"&");
    if(!imageUrl)return fallback(code);

    const img=await fetch(imageUrl,{
      headers:{"user-agent":"Mozilla/5.0 NBA-Career-Universe/2.1"},
      next:{revalidate:604800}
    });
    if(!img.ok)return fallback(code);

    return new NextResponse(await img.arrayBuffer(),{
      headers:{
        "content-type":img.headers.get("content-type")||"image/png",
        "cache-control":"public,max-age=604800,stale-while-revalidate=2592000",
        "x-logo-source":"SportsLogos.Net"
      }
    });
  }catch{
    return fallback(code);
  }
}
