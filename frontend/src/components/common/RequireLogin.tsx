import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth } from "../../firebase";
import logo from "../../assets/medvisionrx-logo.png";
import "./RequireLogin.css";

export default function RequireLogin({ children }: { children: ReactNode }) {
  const [session,setSession]=useState<{ready:boolean;user:User|null}>({ready:false,user:null});
  useEffect(()=>onAuthStateChanged(auth,user=>setSession({ready:true,user}),()=>setSession({ready:true,user:null})),[]);
  if(!session.ready)return <div className="auth-route-check" role="status"><img src={logo} alt="MedVisionRx"/><p>Checking your sign-in...</p></div>;
  if(!session.user)return <Navigate to="/login" replace/>;
  return children;
}
