import GameSelection from "@/components/GameSelection";
import {currentUser} from "@/lib/auth";
import {uiLanguage} from "@/lib/ui-language";
import {db} from "@/lib/db";
export const metadata={title:"Dein Spiel wählen"};
export default async function Page(){const [user,lang]=await Promise.all([currentUser(),uiLanguage()]);const {data,error}=user?await db().from("universes").select("game").eq("owner_id",user.id):{data:[],error:null};if(error)throw error;return <GameSelection en={lang==="en"} signedIn={Boolean(user)} nbaCount={(data||[]).filter(u=>u.game!=="fc").length} fcCount={(data||[]).filter(u=>u.game==="fc").length}/>;}
