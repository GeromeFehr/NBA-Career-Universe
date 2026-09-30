import OpenAI from "openai";
import {footballAiAvailable,footballAiModel,footballAiOptions} from "../lib/football-ai-config";

// A tiny real request catches an unavailable configured model before publishing.
// Never print credentials or application/user data.
async function main(){
if(!footballAiAvailable()){
 console.log("EAFC AI model check skipped: no AI credentials in the build environment.");
}else{
 const model=footballAiModel(),provider=new OpenAI(footballAiOptions());
 const response=await provider.responses.create({model,store:false,reasoning:{effort:"low"},max_output_tokens:1024,input:"Reply with exactly OK."});
 if(response.status!=="completed"||response.output_text.trim()!=="OK")throw Error("EAFC AI model availability check failed.");
 console.log(`EAFC AI model verified: ${response.model}`);
}

}
main().catch(error=>{console.error("EAFC AI model check failed",{model:footballAiModel(),status:error?.status,code:error?.code||"AI_UNAVAILABLE"});process.exitCode=1;});
