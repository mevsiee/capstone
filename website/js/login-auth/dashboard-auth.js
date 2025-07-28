// /js/dashboard-auth.js

// Firebase config and initialization
const firebaseConfig = {
  apiKey: "AIzaSyCAg8tRotR85IWP2qehTLKn5mMSAK_Hu1g",
  authDomain: "eshop-44c5e.firebaseapp.com",
  projectId: "eshop-44c5e",
  storageBucket: "eshop-44c5e.firebasestorage.app",
  messagingSenderId: "1037520511366",
  appId: "1:1037520511366:web:dbd821023be0c3aa48cc07",
  measurementId: "G-NVTV17LBHP"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Firebase auth state check
document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Inject user info into UI
    const username = user.displayName || user.email || "User";
    const userInfoSpan = document.querySelector(".user-info span");
    if (userInfoSpan) {
      userInfoSpan.textContent = `Welcome ${username}!`;
    }

    // Bind logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to logout?")) {
          auth.signOut().then(() => {
            window.location.href = "/docs/index.html";
          }).catch((error) => {
            console.error("Logout error:", error);
          });
        }
      });
    }
  });
});
