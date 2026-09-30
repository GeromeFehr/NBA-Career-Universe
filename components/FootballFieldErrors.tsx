"use client";
import {Children,cloneElement,createContext,isValidElement,useContext,useId,type ReactNode,type ReactElement} from "react";
import type {FootballFieldError} from "@/lib/football-validation";
export const FootballErrorsContext=createContext<FootballFieldError[]>([]);

// This wrapper also supports controlled controls and server-rendered form children.
export function FCLabel({name,label,children,className}:{name:string;label:ReactNode;children:ReactNode;className?:string}){
 const id=useId(),errors=useContext(FootballErrorsContext).filter(error=>error.field===name),errorId=`${id}-error`;
 return <label className={[className,errors.length?"fcInvalidField":""].filter(Boolean).join(" ")}>
  {label}{Children.map(children,child=>{
   if(!isValidElement(child)||!["input","select","textarea"].includes(String(child.type)))return child;
   const control=child as ReactElement<Record<string,any>>;
   return cloneElement(control,{"aria-invalid":errors.length?true:undefined,"aria-describedby":[control.props["aria-describedby"],errors.length?errorId:undefined].filter(Boolean).join(" ")||undefined});
  })}
  {errors.length>0&&<span id={errorId} className="fcFieldError">{errors.map(error=><span key={error.message}>{error.message}</span>)}</span>}
 </label>;
}
