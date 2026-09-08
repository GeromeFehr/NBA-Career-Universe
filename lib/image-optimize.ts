type OptimizedImage={
  dataUrl:string;
  originalBytes:number;
  optimizedBytes:number;
  width:number;
  height:number;
};

function asDataUrl(blob:Blob){
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("Image could not be read."));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas:HTMLCanvasElement,type:string,quality:number){
  return new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error("Image compression failed.")),type,quality);
  });
}

export async function optimizeImage(file:File,maxDimension=1440,quality=0.68):Promise<OptimizedImage>{
  if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)||file.size>25_000_000)throw new Error("JPG, PNG, WEBP, GIF · max. 25 MB");
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));

  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw new Error("Canvas unavailable.");
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(bitmap,0,0,width,height);
  bitmap.close();

  const [webp,jpeg]=await Promise.all([
    canvasBlob(canvas,"image/webp",quality),
    canvasBlob(canvas,"image/jpeg",Math.min(.76,quality+.04))
  ]);
  let best=webp.size<=jpeg.size?webp:jpeg;

  // If recompression somehow gets larger and resizing was not significant,
  // keep the original upload instead of pretending it was optimized.
  if(best.size>=file.size*.98&&scale>.9)best=file;

  return {
    dataUrl:await asDataUrl(best),
    originalBytes:file.size,
    optimizedBytes:best.size,
    width:best===file?Math.round(width/scale):width,
    height:best===file?Math.round(height/scale):height
  };
}

export async function optimizeImages(files:File[],maxFiles=2){
  return Promise.all(files.slice(0,maxFiles).map(file=>optimizeImage(file)));
}
