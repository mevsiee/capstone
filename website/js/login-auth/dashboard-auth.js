// /js/dashboard-auth.js
const firebaseConfig = {
  apiKey: "AIzaSyCAg8tRotR85IWP2qehTLKn5mMSAK_Hu1g",
  authDomain: "eshop-44c5e.firebaseapp.com",
  projectId: "eshop-44c5e",
  storageBucket: "eshop-44c5e.firebasestorage.app",
  messagingSenderId: "1037520511366",
  appId: "1:1037520511366:web:dbd821023be0c3aa48cc07",
  measurementId: "G-NVTV17LBHP"
};

// Prevent duplicate app init on pages that also load other auth scripts
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // your actual login page lives at index.html
      window.location.href = "index.html";
      return;
    }

    // Welcome text (if present on the page)
    const username = user.displayName || user.email || "User";
    const userInfoSpan = document.querySelector(".user-info span");
    if (userInfoSpan) {
      userInfoSpan.textContent = `Welcome ${username}!`;
    }

    // Show User Management link only for admins
    try {
      const snap = await db.collection("Users").doc(user.email).get();
      if (snap.exists && snap.data().role === "admin") {
        const link = document.getElementById("userManagementLink");
        if (link) link.style.display = "block";
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to logout?")) {
          auth.signOut()
            .then(() => (window.location.href = "/docs/index.html"))
            .catch((error) => console.error("Logout error:", error));
        }
      });
    }
  });
});
