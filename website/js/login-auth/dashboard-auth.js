// ✅ dashboard-auth.js

document.addEventListener("DOMContentLoaded", () => {
  // Ensure Firebase is initialized
  if (!firebase.apps.length) {
    console.error("❌ Firebase not initialized — check firebase-auth.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const username = user.displayName || user.email || "User";
    const userInfoSpan = document.querySelector(".user-info span");
    if (userInfoSpan) {
      userInfoSpan.textContent = `Welcome ${username}!`;
    }

    try {
      const snap = await db.collection("Users").doc(user.email).get();
      if (snap.exists && snap.data().role === "admin") {
        const link = document.getElementById("userManagementLink");
        if (link) link.style.display = "block";
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to logout?")) {
          auth.signOut()
            .then(() => (window.location.href = "../index.html"))
            .catch((error) => console.error("Logout error:", error));
        }
      });
    }
  });
});