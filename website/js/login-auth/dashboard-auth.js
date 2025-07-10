// /js/dashboard-auth.js

// Firebase config and initialization
const firebaseConfig = {
  apiKey: "AIzaSyAJLvwiX8p4MhXECrwjYkNj-3bjz_-ws0k",
  authDomain: "eshop-pos.firebaseapp.com",
  projectId: "eshop-pos",
  storageBucket: "eshop-pos.firebasestorage.app",
  messagingSenderId: "1062872438604",
  appId: "1:1062872438604:web:9d654fd276b9d4158521e9",
  measurementId: "G-HBJLH7Q3CH"
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
