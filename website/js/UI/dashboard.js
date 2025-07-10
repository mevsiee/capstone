// /js/dashboard-ui.js

document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".menu-item a");
  const contentSections = document.querySelectorAll(".content-section");
  const pageTitle = document.getElementById("pageTitle");

  // Menu navigation
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active from all
      document.querySelectorAll(".menu-item").forEach((mi) => mi.classList.remove("active"));

      // Activate selected menu
      this.parentElement.classList.add("active");

      // Hide all sections, show selected
      const targetSection = this.getAttribute("data-section");
      contentSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(targetSection).classList.add("active");

      // Update page title
      const sectionTitle = this.querySelector("span").textContent;
      if (pageTitle) pageTitle.textContent = sectionTitle;
    });
  });

  // Smooth transition effect
  contentSections.forEach((section) => {
    section.style.transition = "opacity 0.3s ease-in-out";
  });
});


setInterval(() => {
  const iframe = document.getElementById("lookerReport");
  iframe.src = iframe.src; // Triggers reload
}, 30000 ); 