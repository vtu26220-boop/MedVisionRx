import { browserSessionPersistence, setPersistence, signInWithCustomToken, signOut, type Auth } from "firebase/auth";
import { auth as websiteAuth } from "../../firebase";
import { adminAuth, adminPersistenceReady } from "../../pages/admin/adminFirebase";
const endpoint=(import.meta.env.VITE_API_URL||"http://127.0.0.1:8000").replace(/\/+$/,"")+"/api/admin/website-session";
async function transfer(source:Auth,target:Auth) {
  await source.authStateReady();const user=source.currentUser;
  if(!user)throw new Error("Sign in with your administrator account first.");
  const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:"no-store"});
  const data=await response.json();
  if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:"Unable to link administrator sessions.");
  if(data.uid!==user.uid||!data.token||source.currentUser?.uid!==user.uid)throw new Error("Your session changed. Please retry.");
  await adminPersistenceReady;
  await setPersistence(target,browserSessionPersistence);
  const result=await signInWithCustomToken(target,data.token);
  if(result.user.uid!==user.uid){await signOut(target);throw new Error("Unable to verify the linked session.");}
}
export const openWebsiteAsAdmin=()=>transfer(adminAuth,websiteAuth);
export const returnToAdmin=()=>transfer(websiteAuth,adminAuth);
export async function signOutWebsiteAccount(){
  const uid=websiteAuth.currentUser?.uid;
  await signOut(websiteAuth);
  if(uid&&adminAuth.currentUser?.uid===uid)await signOut(adminAuth);
}
export async function signOutAdministrator(){
  const uid=adminAuth.currentUser?.uid;
  await signOut(adminAuth);
  if(uid&&websiteAuth.currentUser?.uid===uid)await signOut(websiteAuth);
}
