// platformIntegration.js

const API = "http://localhost:8000"; // FastAPI backend port

async function fetchPlatformIntegrations() {
  try {
    const res = await fetch(`${API}/platform/integration`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load platform integration:", err);
    return [];
  }
}

async function renderPlatformIntegrations() {
  const container = document.getElementById("platformList");
  if (!container) return;

  container.innerHTML = "Loading...";

  const platforms = await fetchPlatformIntegrations();
  container.innerHTML = "";

  platforms.forEach(platform => {
    const item = document.createElement("div");
    item.className = `platform-item ${platform.active ? "" : "inactive-container"}`;

    item.innerHTML = `
      <div class="platform-info">
        <h3>${platform.name} ${platform.active ? "✓" : "!"}</h3>
        <p>${platform.description}</p>
      </div>

      <div class="platform-status ${platform.active ? "" : "inactive-pill"}">
        ${platform.active ? "Active" : "Not Syncing"}
      </div>
    `;

    container.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", renderPlatformIntegrations);