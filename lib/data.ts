import type {Json} from "@/lib/database.types";
export function jsonRows(value:Json|unknown):Record<string,any>[] {
  return Array.isArray(value)?value.filter((x):x is Record<string,any>=>!!x&&typeof x==="object"&&!Array.isArray(x)):[];
}
export function jsonObject(value:Json|unknown):Record<string,any> {
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,any>:{};
}
export function checked<T>({data,error}:{data:T;error:unknown}):T {if(error)throw error;return data;}
