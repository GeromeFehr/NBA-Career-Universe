import sharp from "sharp";
import {imageMime} from "./image-format";

export async function normalizeScreenshot(bytes:Buffer){
 if(bytes.length>4_000_000)throw Error("IMAGE_SERVER_LIMIT");
 const mime=imageMime(bytes);if(!mime)throw Error("IMAGE_FORMAT");
 try{
  const {data,info}=await sharp(bytes,{limitInputPixels:50_000_000,failOn:"error",animated:false})
   .rotate().resize({width:1440,height:1440,fit:"inside",withoutEnlargement:true})
   .flatten({background:"#ffffff"}).toColourspace("srgb").jpeg({quality:75}).timeout({seconds:10}).toBuffer({resolveWithObject:true});
  return {dataUrl:"data:image/jpeg;base64,"+data.toString("base64"),width:info.width,height:info.height,optimizedBytes:data.length};
 }catch{throw Error(mime==="image/heic"?"IMAGE_HEIC":"IMAGE_DECODE_FAILED");}
}

export async function readImageBody(req:Request){
 if(Number(req.headers.get("content-length")||0)>4_000_000)throw Error("IMAGE_SERVER_LIMIT");
 const reader=req.body?.getReader();if(!reader)throw Error("IMAGE_DECODE_FAILED");
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4_000_000){await reader.cancel();throw Error("IMAGE_SERVER_LIMIT");}chunks.push(value);}
 return Buffer.concat(chunks);
}
