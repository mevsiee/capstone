document.addEventListener('DOMContentLoaded', function() {

    // Constants for owner
    const OWNER_EMAIL = "eshopclothing12@gmail.com";
    const OWNER_DOC_ID = "e2Cb42i5l51ib3Urrr0q";

    // Initialize Firebase Auth and Firestore
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Show content immediately
    document.querySelector('.settings-content').style.display = 'block';

    // Function to set input value
    function setInputValue(elementId, value) {
        const input = document.getElementById(elementId);
        if (input && value) {
            input.value = value;
            input.style.color = 'white';
            input.style.opacity = '1';
        }
    }

    // Function to set input placeholder
    function setInputPlaceholder(elementId, value) {
        const input = document.getElementById(elementId);
        if (input && value) {
            input.placeholder = value;
        }
    }

    // Load business settings
    async function loadUserData(user) {
        try {
            let docRef;
            if (user?.email === OWNER_EMAIL) {
                // 👑 Business Owner → always load fixed BusinessSettings doc
                docRef = db.collection("BusinessSettings").doc(OWNER_DOC_ID);
            } else {
                // 👥 Employee → load their personal BusinessSettings/{uid}
                docRef = db.collection("BusinessSettings").doc(user.uid);
            }

            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                console.log("Loaded business settings:", data);

                setInputValue("contactName", data.contactName);
                setInputValue("contactEmail", data.contactEmail);
                setInputValue("businessName", data.businessName);
                setInputValue("contactNumber", data.contactNumber);
                setInputValue("businessAddress", data.businessAddress);
            }
        } catch (error) {
            console.error("Error loading business settings:", error);
        }
    }

    // Save account form submission

    document.getElementById("accountForm").addEventListener("submit", async function(e) {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to update your account information.");
            return;
        }

        // Get form values
        const contactName = document.getElementById("contactName").value;
        const businessName = document.getElementById("businessName").value;
        const contactNumber = document.getElementById("contactNumber").value;
        const businessAddress = document.getElementById("businessAddress").value;
        const contactEmail = document.getElementById("contactEmail").value;

        try {
            let docRef;
            if (user?.email === OWNER_EMAIL) {
                // 👑 Save owner info into fixed BusinessSettings doc
                docRef = db.collection("BusinessSettings").doc(OWNER_DOC_ID);
            } else {
                // 👥 Save employee info into BusinessSettings/{uid}
                docRef = db.collection("BusinessSettings").doc(user.uid);
            }

            await docRef.set({
                contactName,
                businessName,
                contactNumber,
                businessAddress,
                contactEmail
            }, { merge: true });

            alert("Account information updated successfully!");
        } catch (error) {
            console.error("Error updating account:", error);
            alert("Error updating account information: " + error.message);
        }
    });


    // Check platform integration status (still inside Users collection for POS)
    async function checkPlatformStatus() {
        try {
            const user = auth.currentUser;
            if (user) {
                const platformsDoc = await db.collection('Users').doc(user.uid).collection('platforms').doc('status').get();
                if (platformsDoc.exists) {
                    const platforms = platformsDoc.data();
                    Object.keys(platforms).forEach(platform => {
                        const platformElement = document.querySelector(`.platform-item[data-platform="${platform}"]`);
                        if (platformElement && platforms[platform].connected) {
                            platformElement.classList.add('connected');
                            platformElement.querySelector('.platform-status').textContent = 'Active';
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error checking platform status:', error);
        }
    }

    // Handle auth state
    auth.onAuthStateChanged(async function(user) {
        if (user) {
            await loadUserData(user);   // ✅ load from BusinessSettings
            await checkPlatformStatus(); // ✅ POS-related checks remain
        } else {
            // If not logged in, fetch owner doc and set placeholders
            try {
                const docRef = db.collection("BusinessSettings").doc(OWNER_DOC_ID);
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    setInputPlaceholder("contactName", data.contactName);
                    setInputPlaceholder("contactEmail", data.contactEmail);
                    setInputPlaceholder("businessName", data.businessName);
                    setInputPlaceholder("contactNumber", data.contactNumber);
                    setInputPlaceholder("businessAddress", data.businessAddress);
                }
            } catch (error) {
                console.error("Error loading placeholder business settings:", error);
            }
        }
    });

    // Password update
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to change your password.');
            return;
        }

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword.length < 8) {
            alert('New password must be at least 8 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        try {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            document.getElementById('passwordForm').reset();
            alert('Password updated successfully! Please log in again with your new password.');
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Error updating password: ' + error.message);
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            alert('Error signing out. Please try again.');
        });
    });

    // Notification preferences → still using localStorage (unchanged)
    function saveNotificationPreferences() {
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const lowStockAlerts = document.getElementById('lowStockAlerts').checked;
        localStorage.setItem('emailNotifications', emailNotifications);
        localStorage.setItem('lowStockAlerts', lowStockAlerts);
    }
    function loadNotificationPreferences() {
        const emailNotifications = localStorage.getItem('emailNotifications') === 'true';
        const lowStockAlerts = localStorage.getItem('lowStockAlerts') === 'true';
        document.getElementById('emailNotifications').checked = emailNotifications;
        document.getElementById('lowStockAlerts').checked = lowStockAlerts;
    }
    document.getElementById('emailNotifications').addEventListener('change', saveNotificationPreferences);
    document.getElementById('lowStockAlerts').addEventListener('change', saveNotificationPreferences);
    loadNotificationPreferences();
});