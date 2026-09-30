export const defaultFootballAiModel="gpt-6.1-sol";
// This setting is scoped to EAFC media; NBA and screenshot models retain their own setting.
export function footballAiModel(){return process.env.OPENAI_FOOTBALL_MODEL||defaultFootballAiModel;}
export function footballAiAvailable(){return Boolean(process.env.OPENAI_API_KEY||(process.env.NETLIFY_AI_GATEWAY_KEY&&process.env.OPENAI_BASE_URL));}
export function footballAiOptions(){return {apiKey:process.env.OPENAI_API_KEY||process.env.NETLIFY_AI_GATEWAY_KEY,baseURL:process.env.OPENAI_BASE_URL,maxRetries:0,timeout:28000};}
