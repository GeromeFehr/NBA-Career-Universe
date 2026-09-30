import {NextResponse} from "next/server";
import {requireFootball} from "@/lib/football-data";
import {privateResponse} from "@/lib/private-response";
import {apiFailure} from "@/lib/http";
import {normalizeScreenshot,readImageBody} from "@/lib/image-normalize";
export const runtime="nodejs";
export const maxDuration=20;
export async function POST(req:Request){try{await requireFootball();return privateResponse(NextResponse.json(await normalizeScreenshot(await readImageBody(req))));}catch(error){const code=error instanceof Error?error.message:"";if(code.startsWith("IMAGE_"))return privateResponse(NextResponse.json({code},{status:code==="IMAGE_SERVER_LIMIT"?413:422}));return apiFailure(error);}}
