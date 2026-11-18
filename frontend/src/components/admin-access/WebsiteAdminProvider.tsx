import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { WebsiteAdminContext } from "./WebsiteAdminContext";
import ReturnToAdmin from "./ReturnToAdmin";
export default function WebsiteAdminProvider({children}:{children:ReactNode}) {
  const [identity,setIdentity]=useState({uid:"",isAdmin:false});
  useEffect(()=>{let controller=new AbortController();const unsubscribe=onAuthStateChanged(auth,async user=>{
    controller.abort();controller=new AbortController();const signal=controller.signal;setIdentity({uid:user?.uid||"",isAdmin:false});
    if(!user)return;
    try{const base=(import.meta.env.VITE_API_URL||"http://127.0.0.1:8000").replace(/\/+$/,"");const response=await fetch(base+"/api/users/me",{headers:{Authorization:`Bearer ${await user.getIdToken()}`},signal,cache:"no-store"});if(!response.ok)return;const data=await response.json();if(!signal.aborted&&auth.currentUser?.uid===user.uid)setIdentity({uid:user.uid,isAdmin:data.user?.is_admin===true});}catch{/* Administrative UI stays hidden if verification fails. */}
  });return()=>{controller.abort();unsubscribe();};},[]);
  return <WebsiteAdminContext.Provider value={identity}>{children}<ReturnToAdmin/></WebsiteAdminContext.Provider>;
}
