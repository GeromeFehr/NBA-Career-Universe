import {NextResponse} from "next/server";
export async function POST(req:Request){const r=NextResponse.redirect(new URL("/",req.url),303);r.cookies.set("career_session","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return r}
