import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class Staff {
  final String id;
  final String name;

  Staff({required this.id, required this.name});

  factory Staff.fromJson(Map<String, dynamic> json) {
    return Staff(
      id: json['id']?.toString() ?? '',
      name: json['Name'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'Name': name,
    };
  }
}

class StaffProvider with ChangeNotifier {
  List<Staff> _staffList = [];
  bool _isLoading = false;

  List<Staff> get staffList => _staffList;
  bool get isLoading => _isLoading;

  Future<void> fetchStaff({bool forceRefresh = false}) async {
    _isLoading = true;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    final cachedJson = prefs.getString('cached_staff');

    // Use cached if not forcing refresh and available
    if (!forceRefresh && cachedJson != null) {
      try {
        final cachedData = json.decode(cachedJson) as List;
        _staffList = cachedData.map((e) => Staff.fromJson(e)).toList();
        _isLoading = false;
        notifyListeners();
        return;
      } catch (e) {
        print('❌ Error loading cached staff: $e');
        // Fall through to fetch from API
      }
    }

    try {
      final response = await http
          .get(Uri.parse('http://192.168.254.113:3000/api/employees'));

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as List;
        _staffList = data.map((json) => Staff.fromJson(json)).toList();

        // Cache the result
        final jsonStr = json.encode(_staffList.map((s) => s.toJson()).toList());
        await prefs.setString('cached_staff', jsonStr);
      }
    } catch (e) {
      print('❌ Failed to fetch staff from server: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
