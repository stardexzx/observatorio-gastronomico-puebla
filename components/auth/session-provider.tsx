"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/types";
const SessionContext=createContext<SessionUser|null>(null);
export const useSessionUser=()=>useContext(SessionContext);
export function SessionProvider({user,children}:{user:SessionUser|null;children:ReactNode}){
 useEffect(()=>{
  // History may restore an authenticated document without consulting the server.
  const revalidate=(event:PageTransitionEvent)=>{if(event.persisted)window.location.reload();};
  window.addEventListener('pageshow',revalidate);
  return()=>window.removeEventListener('pageshow',revalidate);
 },[]);
 return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;}
