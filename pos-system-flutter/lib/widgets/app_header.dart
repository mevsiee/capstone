import 'package:flutter/material.dart';
import 'package:pos_system/models/user.dart';
import 'package:pos_system/screens/account_settings_screen.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final User? user;
  final VoidCallback onLogout;

  const AppHeader({
    Key? key,
    required this.user,
    required this.onLogout,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Row(
        children: [
          const Icon(Icons.shopping_bag, size: 20),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'E-Shop Clothing',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Profile icon with dropdown menu
          _buildProfileMenu(context),
        ],
      ),
    );
  }

  Widget _buildProfileMenu(BuildContext context) {
    return PopupMenuButton<String>(
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: CircleAvatar(
        radius: 16,
        backgroundColor: Colors.grey[300],
        backgroundImage: user?.image != null ? NetworkImage(user!.image!) : null,
        child: user?.image == null
            ? Text(
                user != null && user!.name.isNotEmpty 
                    ? user!.name[0] 
                    : '?',
                style: const TextStyle(fontSize: 14),
              )
            : null,
      ),
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        // User name (non-selectable header)
        PopupMenuItem<String>(
          enabled: false,
          child: _buildUserHeader(context),
        ),
        const PopupMenuDivider(),
        // Account Settings
        PopupMenuItem<String>(
          value: 'settings',
          child: _buildMenuItem(
            icon: Icons.settings,
            text: 'Account Settings',
          ),
        ),
        // Logout
        PopupMenuItem<String>(
          value: 'logout',
          child: _buildMenuItem(
            icon: Icons.logout,
            text: 'Log Out',
          ),
        ),
      ],
      onSelected: (String value) {
        if (value == 'logout') {
          onLogout();
        } else if (value == 'settings') {
          // Navigate to account settings screen
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const AccountSettingsScreen(),
            ),
          );
        }
      },
    );
  }

  Widget _buildUserHeader(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: Colors.grey[300],
          backgroundImage: user?.image != null ? NetworkImage(user!.image!) : null,
          child: user?.image == null
              ? Text(
                  user != null && user!.name.isNotEmpty 
                      ? user!.name[0] 
                      : '?',
                  style: const TextStyle(fontSize: 16),
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            user?.name ?? 'Guest User',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuItem({required IconData icon, required String text}) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.black54),
        const SizedBox(width: 12),
        Text(text),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
