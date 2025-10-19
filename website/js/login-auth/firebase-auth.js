// ✅ firebase-auth.js

// Define config once
const firebaseConfig = {
  apiKey: "AIzaSyCAg8tRotR85IWP2qehTLKn5mMSAK_Hu1g",
  authDomain: "eshop-44c5e.firebaseapp.com",
  projectId: "eshop-44c5e",
  storageBucket: "eshop-44c5e.firebasestorage.app",
  messagingSenderId: "1037520511366",
  appId: "1:1037520511366:web:dbd821023be0c3aa48cc07"
};

// Initialize Firebase only if needed
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleSignIn");
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");

  async function validateAndSyncUser(user) {
    if (!user?.email) return false;
    const docRef = db.collection("Users").doc(user.email);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: "viewer",
        permissions: {
          canViewDashboard: true,
          canEditInventory: false,
          canAdjustForecast: false
        }
      });
      console.log("New user added to Firestore:", user.email);
      return true;
    }

    const data = doc.data();
    const updates = {};
    if (!data.uid) updates.uid = user.uid;
    if (!data.createdAt) updates.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    if (Object.keys(updates).length > 0) {
      await docRef.update(updates);
      console.log("Updated missing user fields in Firestore.");
    }

    return true;
  }

  function redirectToDashboard() {
    window.location.href = "dashboard.html";
  }

  function handleLoginError(error) {
    console.error("Login error:", error);
    const code = error.code || "";
    if (code === "auth/invalid-email") {
      errorDiv.textContent = "Invalid email address format.";
    } else if (code === "auth/user-not-found") {
      errorDiv.textContent = "This account does not exist.";
    } else {
      errorDiv.textContent = "Email or password is incorrect.";
    }
  }

  googleBtn?.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      const allowed = await validateAndSyncUser(user);
      if (!allowed) {
        await auth.signOut();
        alert("Access denied. This account is not registered.");
        return;
      }
      redirectToDashboard();
    } catch (error) {
      alert(error.message || "Google sign-in failed.");
    }
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorDiv.textContent = "";

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) {
      errorDiv.textContent = "Email or password is incorrect.";
      return;
    }

    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      const user = result.user;
      const allowed = await validateAndSyncUser(user);
      if (!allowed) {
        await auth.signOut();
        errorDiv.textContent = "Access denied. This account is not registered.";
        return;
      }
      redirectToDashboard();
    } catch (error) {
      handleLoginError(error);
    }
  });
});