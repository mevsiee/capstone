// /js/UI/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".menu-item a");

  // Sidebar navigation
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      // Handle logout separately
      if (this.id === "logoutBtn") {
        e.preventDefault();
        handleLogout();
        return;
      }

      // If href points to another HTML page, follow the link
      if (href && href.endsWith(".html")) {
        window.location.href = href;
      }
    });
  });
});

// Firebase logout function
function handleLogout() {
  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().signOut().then(() => {
      alert("You have been logged out successfully.");
      window.location.href = "../login.html"; // redirect to login page
    }).catch((error) => {
      console.error("Logout failed:", error);
      alert("Logout failed: " + error.message);
    });
  } else {
    console.error("Firebase not initialized.");
  }
}