import {privateResponse} from "@/lib/private-response";
import {NextResponse} from "next/server";
import {authDb} from "@/lib/supabase/server";
export async function GET(req:Request){const url=new URL(req.url),code=url.searchParams.get("code"),lang=url.searchParams.get("lang")==="en"?"en":"de";if(code){const {error}=await (await authDb()).auth.exchangeCodeForSession(code);if(!error)return privateResponse(NextResponse.redirect(new URL("/universes",url)));}return privateResponse(NextResponse.redirect(new URL(`/login?error=confirmation&lang=${lang}`,url)));}
