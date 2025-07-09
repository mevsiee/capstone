import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import 'package:pos_system/models/user.dart';

class AuthProvider with ChangeNotifier {
  final fb_auth.FirebaseAuth _firebaseAuth = fb_auth.FirebaseAuth.instance;

  User? _user;
  bool _isLoading = false;

  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isLoading => _isLoading;

  AuthProvider() {
    checkLoginStatus(); // Check current Firebase session
  }

  Future<void> checkLoginStatus() async {
    final fbUser = _firebaseAuth.currentUser;

    if (fbUser != null) {
      _user = User(
        name: fbUser.displayName ?? "No Name",
        email: fbUser.email ?? "No Email",
        image: fbUser.photoURL ??
            "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
      );
    } else {
      _user = null;
    }

    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      await checkLoginStatus();
      _isLoading = false;
      return true;
    } on fb_auth.FirebaseAuthException catch (e) {
      debugPrint("Login failed: ${e.message}");
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    await _firebaseAuth.signOut();
    _user = null;
    notifyListeners();
  }
}
