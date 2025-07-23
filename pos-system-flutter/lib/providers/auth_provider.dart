import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import 'package:pos_system/models/user.dart';

class AuthProvider with ChangeNotifier {
  final fb_auth.FirebaseAuth _firebaseAuth = fb_auth.FirebaseAuth.instance;

  User? _user;
  bool _isLoading = false;
  String _errorMessage = '';

  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  AuthProvider() {
    checkLoginStatus(); // Check current Firebase session
  }

  Future<void> checkLoginStatus() async {
    final fbUser = _firebaseAuth.currentUser;

    if (fbUser != null) {
      _user = User(
        name: fbUser.displayName ?? "No Name",
        email: fbUser.email ?? "No Email",
      );
    } else {
      _user = null;
    }

    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      await checkLoginStatus();
      _isLoading = false;
      notifyListeners();
      return true;
    } on fb_auth.FirebaseAuthException catch (e) {
      debugPrint("Login failed: ${e.message}");

      if (e.code == 'user-not-found' || e.code == 'wrong-password') {
        _errorMessage = 'Invalid email or password';
      } else {
        _errorMessage = e.message ?? 'Login failed';
      }
    } catch (e) {
      _errorMessage = 'An unexpected error occurred';
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

  void clearError() {
    if (_errorMessage.isNotEmpty) {
      _errorMessage = '';
      notifyListeners();
    }
  }
}
