import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
}

class StaffProvider with ChangeNotifier {
  List<Staff> _staffList = [];

  List<Staff> get staffList => _staffList;

  Future<void> fetchStaff() async {
    final url = Uri.parse('http://localhost:3000/api/employees');
    final response = await http.get(url);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      _staffList = data.map((e) => Staff.fromJson(e)).toList();
      notifyListeners();
    } else {
      throw Exception('Failed to load staff');
    }
  }
}
