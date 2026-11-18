import { getApps, initializeApp } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import websiteApp from "../../firebase";

// A separate Firebase app keeps administrator sign-in/out from replacing the
// existing website user's session. Both still use the same Firebase project.
const adminApp = getApps().find((app) => app.name === "medvisionrx-admin")
  || initializeApp(websiteApp.options, "medvisionrx-admin");
export const adminAuth = getAuth(adminApp);
export const adminPersistenceReady = setPersistence(adminAuth, browserSessionPersistence);
