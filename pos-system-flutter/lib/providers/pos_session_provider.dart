import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PosSessionProvider with ChangeNotifier {
  bool _isSessionActive = false;
  DateTime? _sessionStartTime;
  bool _isLoading = false;

  bool get isSessionActive => _isSessionActive;
  DateTime? get sessionStartTime => _sessionStartTime;
  bool get isLoading => _isLoading;

  String get sessionDuration {
    if (_sessionStartTime == null) return '';
    final duration = DateTime.now().difference(_sessionStartTime!);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    return '${hours}h ${minutes}m';
  }

  PosSessionProvider() {
    _loadSessionState();
  }

  Future<void> _loadSessionState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isSessionActive = prefs.getBool('pos_session_active') ?? false;
      final startTimeString = prefs.getString('pos_session_start_time');
      if (startTimeString != null) {
        _sessionStartTime = DateTime.parse(startTimeString);
      }
      notifyListeners();
    } catch (e) {
      print('Error loading session state: $e');
    }
  }

  Future<void> startSession() async {
    try {
      _isLoading = true;
      notifyListeners();

      final prefs = await SharedPreferences.getInstance();
      _isSessionActive = true;
      _sessionStartTime = DateTime.now();

      await prefs.setBool('pos_session_active', true);
      await prefs.setString(
          'pos_session_start_time', _sessionStartTime!.toIso8601String());

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      throw Exception('Failed to start POS session: $e');
    }
  }

  Future<void> endSession() async {
    try {
      _isLoading = true;
      notifyListeners();

      final prefs = await SharedPreferences.getInstance();
      _isSessionActive = false;
      _sessionStartTime = null;

      await prefs.remove('pos_session_active');
      await prefs.remove('pos_session_start_time');

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      throw Exception('Failed to end POS session: $e');
    }
  }
}
