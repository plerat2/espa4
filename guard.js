import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function requireAuth(redirectTo = "login.html") {
  onAuthStateChanged(auth, (user) => {
    if (!user) window.location = redirectTo;
  });
}