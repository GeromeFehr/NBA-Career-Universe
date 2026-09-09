/** Detect actual bytes rather than trusting a phone's MIME type or extension. */
export function imageMime(bytes:Uint8Array):string|null{
 const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.subarray(a,b));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return "image/png";
 if(["GIF87a","GIF89a"].includes(ascii(0,6)))return "image/gif";
 if(ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")return "image/webp";
 if(ascii(4,8)==="ftyp"){
  const brands=[ascii(8,12)];for(let i=16;i+4<=Math.min(bytes.length,64);i+=4)brands.push(ascii(i,i+4));
  if(brands.some(b=>["avif","avis"].includes(b)))return "image/avif";
  if(brands.some(b=>["heic","heix","hevc","hevx","mif1","msf1"].includes(b)))return "image/heic";
 }
 if(ascii(0,2)==="BM")return "image/bmp";
 if((ascii(0,2)==="II"&&bytes[2]===42&&bytes[3]===0)||(ascii(0,2)==="MM"&&bytes[2]===0&&bytes[3]===42))return "image/tiff";
 return null;
}
export function imageErrorMessage(error:unknown,language:"de"|"en"){
 const code=error instanceof Error?error.message:"IMAGE_DECODE_FAILED";
 const messages:Record<string,[string,string]>={
  IMAGE_TOO_LARGE:["Das Bild ist größer als 25 MB. Bitte zuschneiden oder kleiner exportieren.","The image exceeds 25 MB. Crop it or export a smaller version."],
  IMAGE_SERVER_LIMIT:["Der Browser kann dieses Bild nicht öffnen und es ist für die Ersatzkonvertierung zu groß. Bitte als JPG/PNG unter 4 MB exportieren.","The browser cannot open this image and it exceeds the fallback conversion limit. Export it as JPG/PNG under 4 MB."],
  IMAGE_FORMAT:["Bitte eine Bilddatei auswählen, zum Beispiel JPG, PNG oder WEBP. Eine umbenannte Datei reicht nicht.","Choose an image file such as JPG, PNG or WEBP. Renaming a file does not convert it."],
  IMAGE_HEIC:["Dieses HEIC-Bild lässt sich hier nicht öffnen. Bitte als JPG/PNG exportieren oder einen Screenshot des geöffneten Bildes verwenden.","This HEIC image cannot be opened here. Export it as JPG/PNG or take a screenshot of the opened image."],
  IMAGE_DECODE_FAILED:["Das Bild konnte nicht geöffnet werden. Lade die Originaldatei erneut herunter oder exportiere sie als JPG/PNG und wähle sie erneut aus.","The image could not be opened. Download the original again or export it as JPG/PNG and select it again."],
  IMAGE_CONVERSION_FAILED:["Die Bildkonvertierung ist gerade nicht erreichbar. Bitte erneut versuchen oder das Bild als JPG/PNG auswählen.","Image conversion is currently unavailable. Try again or choose a JPG/PNG image."],
  UNAUTHORIZED:["Bitte melde dich erneut an und wähle das Bild noch einmal aus.","Sign in again and select the image once more."]
 };
 return (messages[code]||messages.IMAGE_DECODE_FAILED)[language==="en"?1:0];
}
