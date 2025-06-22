import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pos_system/models/user.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;

  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _loadUserFromPrefs();
  }

  Future<void> _loadUserFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    
    if (userJson != null) {
      try {
        final Map<String, dynamic> userMap = json.decode(userJson) as Map<String, dynamic>;
        _user = User.fromJson(userMap);
        notifyListeners();
      } catch (e) {
        print('Error loading user from preferences: $e');
      }
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    // Simulate API call
    await Future.delayed(const Duration(seconds: 2));

    // Mock login - in a real app, this would validate against a backend
    if (email.isNotEmpty) {
      final mockUser = User(
        name: "John Doe",
        email: email,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      );

      _user = mockUser;
      
      // Save to shared preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', json.encode(mockUser.toJson()));
      
      _isLoading = false;
      notifyListeners();
      return true;
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    _user = null;
    
    // Clear from shared preferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user');
    
    notifyListeners();
  }
}
