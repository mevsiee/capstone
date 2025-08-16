document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded');
    
    // Show the content immediately
    document.querySelector('.settings-content').style.display = 'block';
    
    try {
        firebase.auth().onAuthStateChanged(function(user) {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            if (user) {
                // User is signed in
                populateUserData(user);
            }
        });
    } catch (error) {
        console.error('Firebase auth error:', error);
    }

    // Populate user data
    function populateUserData(user) {
        document.getElementById('userEmail').value = user.email;
        if (user.displayName) {
            document.getElementById('userName').value = user.displayName;
        }
    }

    // Profile Form Submission
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        const newName = document.getElementById('userName').value;

        if (user) {
            user.updateProfile({
                displayName: newName
            }).then(() => {
                alert('Profile updated successfully!');
            }).catch((error) => {
                alert('Error updating profile: ' + error.message);
            });
        }
    });

    // Password Change Form Submission
    document.getElementById('passwordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        // Reauthenticate user before changing password
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );

        user.reauthenticateWithCredential(credential).then(() => {
            // User reauthenticated, now change password
            return user.updatePassword(newPassword);
        }).then(() => {
            alert('Password updated successfully!');
            document.getElementById('passwordForm').reset();
        }).catch((error) => {
            alert('Error updating password: ' + error.message);
        });
    });

    // Save notification preferences
    function saveNotificationPreferences() {
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const lowStockAlerts = document.getElementById('lowStockAlerts').checked;
        
        // Here you would typically save these preferences to your database
        // For now, we'll just save to localStorage as an example
        localStorage.setItem('emailNotifications', emailNotifications);
        localStorage.setItem('lowStockAlerts', lowStockAlerts);
    }

    // Load notification preferences
    function loadNotificationPreferences() {
        const emailNotifications = localStorage.getItem('emailNotifications') === 'true';
        const lowStockAlerts = localStorage.getItem('lowStockAlerts') === 'true';
        
        document.getElementById('emailNotifications').checked = emailNotifications;
        document.getElementById('lowStockAlerts').checked = lowStockAlerts;
    }

    // Add event listeners for notification toggles
    document.getElementById('emailNotifications').addEventListener('change', saveNotificationPreferences);
    document.getElementById('lowStockAlerts').addEventListener('change', saveNotificationPreferences);

    // Load saved preferences when page loads
    loadNotificationPreferences();

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            alert('Error signing out: ' + error.message);
        });
    });
});
