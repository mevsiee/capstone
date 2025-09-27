// js/UI/usermanagement.js
// Requires Firebase initialized (already handled by your firebase-init.js)

const usersTable = document.getElementById("usersTable");

// Load users from Firestore
async function loadUsers() {
  const snapshot = await firebase.firestore().collection("Users").get();
  snapshot.forEach(doc => {
    const user = doc.data();
    addUserRow(user);
  });
}

// Add one row to the table
function addUserRow(user) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${user.email}</td>
    <td>
      <select data-email="${user.email}">
        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
        <option value="viewer" ${user.role === "viewer" ? "selected" : ""}>Viewer</option>
      </select>
    </td>
    <td class="actions">
      <button class="saveBtn" data-email="${user.email}">Save</button>
      <button class="removeBtn" data-email="${user.email}">Remove</button>
    </td>
  `;
  usersTable.appendChild(tr);
}
// Listen for Save clicks
usersTable.addEventListener("click", async (e) => {
  const email = e.target.dataset.email;

  if (e.target.classList.contains("saveBtn")) {
    const newRole = document.querySelector(`select[data-email="${email}"]`).value;
    await firebase.firestore().collection("Users").doc(email).update({ role: newRole });
    alert(`Updated ${email} to ${newRole}`);
  }

  if (e.target.classList.contains("removeBtn")) {
    if (confirm(`Are you sure you want to remove ${email}?`)) {
      await firebase.firestore().collection("Users").doc(email).delete();
      e.target.closest("tr").remove(); // remove row from UI
      alert(`${email} has been removed.`);
    }
  }
});

loadUsers();
