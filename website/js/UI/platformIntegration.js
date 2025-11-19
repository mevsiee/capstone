// platformIntegration.js
// Dynamically render platform integration status on the settings page

// Example: Replace this mock data with real API/Firestore data as needed
const platformIntegrations = [
  {
    key: 'shopee',
    name: 'Shopee',
    description: 'Connection disconnected and inactive',
    active: false
  },
  {
    key: 'tiktok',
    name: 'TikTok Shop',
    description: 'Connection active and syncing',
    active: true
  },
  {
    key: 'retail',
    name: 'Retail Store',
    description: 'Connection active and syncing',
    active: true
  }
];

function renderPlatformIntegrations() {
  const container = document.getElementById('platformList');
  if (!container) return;
  container.innerHTML = '';
  platformIntegrations.forEach(platform => {

  const item = document.createElement('div');
  item.className = `platform-item ${platform.active ? '' : 'inactive-container'}`;

  item.innerHTML = `
    <div class="platform-info">
      <h3>${platform.name} <span style="font-size:1em;color:#fff;vertical-align:middle;">&#10003;</span></h3>
      <p>${platform.description}</p>
    </div>
    <div class="platform-status ${platform.active ? 'active' : 'inactive-pill'}">
      ${platform.active ? 'Active' : 'Inactive'}
    </div>
  `;

  container.appendChild(item);
});
}

document.addEventListener('DOMContentLoaded', renderPlatformIntegrations);
