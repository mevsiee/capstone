const firebaseConfig = {
  apiKey: "AIzaSyAJLvwiX8p4MhXECrwjYkNj-3bjz_-ws0k",
  authDomain: "eshop-pos.firebaseapp.com",
  projectId: "eshop-pos",
  storageBucket: "eshop-pos.firebasestorage.app",
  messagingSenderId: "1062872438604",
  appId: "1:1062872438604:web:9d654fd276b9d4158521e9",
  measurementId: "G-HBJLH7Q3CH"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleSignIn");
  const loginForm = document.getElementById("loginForm");
  const errorDiv = document.getElementById("loginError");

  async function validateAndSyncUser(user) {
    if (!user?.email) return false;

    const snapshot = await db.collection("Users")
      .where("email", "==", user.email)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

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
    window.location.href = "/docs/dashboard.html";
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

  /**
   * 🔐 Google Sign-In
   */
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
      console.error("Google sign-in error:", error);
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
