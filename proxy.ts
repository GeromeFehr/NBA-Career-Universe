import {privateResponse} from "@/lib/private-response";
import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
export async function proxy(request:NextRequest){
 const h=new Headers(request.headers);h.delete("x-cu-share");h.delete("x-cu-language");
 const lang=request.nextUrl.searchParams.get("lang")==="en"?"en":request.nextUrl.searchParams.get("lang")==="de"?"de":request.cookies.get("nba_ui_language")?.value||"de";
 h.set("x-cu-language",lang);const share=/^\/share\/([^/]+)$/.exec(request.nextUrl.pathname);if(share)h.set("x-cu-share",share[1]);
 if(request.nextUrl.pathname.startsWith("/api/")&&!["GET","HEAD","OPTIONS"].includes(request.method)){
  const origin=request.headers.get("origin"),site=request.headers.get("sec-fetch-site");let valid=true;
  if(origin){try{valid=new URL(origin).host===(request.headers.get("host")||request.nextUrl.host);}catch{valid=false;}}
  if(!valid||site==="cross-site")return privateResponse(NextResponse.json({error:lang==="en"?"Request origin rejected.":"Anfrageherkunft nicht zulässig."},{status:403}));
  if(Number(request.headers.get("content-length")||0)>9_500_000)return privateResponse(NextResponse.json({error:lang==="en"?"Upload too large.":"Upload zu groß."},{status:413}));
 }
 let response=NextResponse.next({request:{headers:h}});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return privateResponse(response);
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(values,headers)=>{values.forEach(({name,value})=>request.cookies.set(name,value));h.set("cookie",request.cookies.toString());response=NextResponse.next({request:{headers:h}});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));Object.entries(headers).forEach(([name,value])=>response.headers.set(name,value));}}});
 await supabase.auth.getUser();return privateResponse(response);
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$).*)"]};
