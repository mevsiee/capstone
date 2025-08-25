import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:pos_system/models/transaction.dart';
import 'package:pos_system/models/cart_item.dart';
import 'package:pos_system/helpers/local_db_helper.dart';

String generateCustomTransactionId() {
  final millis = DateTime.now().millisecondsSinceEpoch;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  final rand = Random();
  final randomPart =
      List.generate(5, (_) => chars[rand.nextInt(chars.length)]).join();
  return 'TRX-$millis-$randomPart';
}

class TransactionProvider with ChangeNotifier {
  final String _apiUrl =
      'https://asia-southeast1-eshop-44c5e.cloudfunctions.net/api/transactions';
  List<Transaction> _transactions = [];
  String? _expandedTransactionId;

  // Add these properties for UI feedback
  String _statusMessage = '';
  bool _isLoading = false;
  Color _statusColor = Colors.green;

  List<Transaction> get transactions => _transactions;
  String? get expandedTransactionId => _expandedTransactionId;
  String get statusMessage => _statusMessage;
  bool get isLoading => _isLoading;
  Color get statusColor => _statusColor;

  TransactionProvider() {
    fetchTransactions();
    _autoSyncIfNeeded();
  }

  void _showStatus(String message,
      {Color color = Colors.green, bool isLoading = false}) {
    _statusMessage = message;
    _statusColor = color;
    _isLoading = isLoading;
    notifyListeners();
  }

  void clearStatus() {
    _statusMessage = '';
    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTransactions() async {
    _showStatus('Loading transactions...', color: Colors.blue, isLoading: true);

    final prefs = await SharedPreferences.getInstance();
    final cachedJson = prefs.getString('transactions');

    try {
      final response = await http.get(Uri.parse(_apiUrl));
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as List;
        _transactions = data.map((item) => Transaction.fromJson(item)).toList();
        await _cacheTransactions();
        _showStatus('Transactions loaded successfully');
      } else {
        await _loadCachedTransactions(cachedJson);
        _showStatus('Using cached transactions (server unavailable)',
            color: Colors.orange);
      }
    } catch (e) {
      await _loadCachedTransactions(cachedJson);
      _showStatus('Using cached transactions (network error)',
          color: Colors.orange);
    }

    Future.delayed(const Duration(seconds: 3), () {
      clearStatus();
    });
  }

  Future<void> _loadCachedTransactions(String? jsonStr) async {
    if (jsonStr != null) {
      final data = json.decode(jsonStr) as List;
      _transactions = data.map((item) => Transaction.fromJson(item)).toList();
    }
  }

  Future<void> _cacheTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final transactionsJson =
        json.encode(_transactions.map((t) => t.toJson()).toList());
    await prefs.setString('transactions', transactionsJson);
  }

  void toggleExpandTransaction(String id) {
    _expandedTransactionId = _expandedTransactionId == id ? null : id;
    notifyListeners();
  }

  Future<bool> addTransaction({
    required List<CartItem> items,
    required String location,
    required double subtotal,
    required double discount,
    required double total,
    required String employee,
    String? supervisorId,
  }) async {
    _showStatus('Processing transaction...',
        color: Colors.blue, isLoading: true);

    final now = DateTime.now();
    final transactionId = generateCustomTransactionId();
    final formattedDate =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";

    final transaction = Transaction(
      id: transactionId,
      date: formattedDate,
      location: location == 'store' ? 'Store' : 'Warehouse',
      items: items,
      subtotal: subtotal,
      discount: discount,
      total: total,
      employee: employee,
      timestamp: now.toIso8601String(),
    );

    try {
      await LocalDBHelper.insertTransaction(transaction);
      _transactions.insert(0, transaction);
      await _cacheTransactions();
      _showStatus('Transaction saved locally (awaiting sync)',
          color: Colors.orange);
      notifyListeners();

      Future.delayed(const Duration(seconds: 3), () {
        clearStatus();
      });

      _autoSyncIfNeeded();
      return true;
    } catch (e) {
      _showStatus('Local save failed', color: Colors.red);
      return false;
    }
  }

  Future<void> pushCachedTransactionsManually() async {
    final cachedTransactions = await LocalDBHelper.getCachedTransactions();

    if (cachedTransactions.isEmpty) {
      _showStatus('No cached transactions to sync', color: Colors.blue);
      Future.delayed(const Duration(seconds: 2), () {
        clearStatus();
      });
      return;
    }

    _showStatus('Syncing ${cachedTransactions.length} transactions...',
        color: Colors.blue, isLoading: true);

    bool allSuccessful = true;
    int successCount = 0;

    for (var tx in cachedTransactions) {
      try {
        final response = await http.post(
          Uri.parse(_apiUrl),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(tx.toJson()),
        );

        if (response.statusCode == 201) {
          bool alreadyExists = _transactions.any((t) => t.id == tx.id);
          if (!alreadyExists) {
            _transactions.insert(0, tx);
          }
          successCount++;
        } else {
          _showStatus('Server error: ${response.body}', color: Colors.red);
          allSuccessful = false;
          break;
        }
      } catch (e) {
        _showStatus('Network error: Unable to connect to server',
            color: Colors.red);
        allSuccessful = false;
        break;
      }
    }

    if (allSuccessful) {
      await LocalDBHelper.clearCachedTransactions();
      _showStatus('Successfully synced $successCount transactions');
    } else {
      _showStatus(
          'Partial sync: $successCount of ${cachedTransactions.length} synced',
          color: Colors.orange);
    }

    await _cacheTransactions();
    notifyListeners();

    Future.delayed(const Duration(seconds: 4), () {
      clearStatus();
    });
  }

  Future<void> _autoSyncIfNeeded() async {
    final cachedTransactions = await LocalDBHelper.getCachedTransactions();
    if (cachedTransactions.length >= 20) {
      try {
        final response = await http.get(Uri.parse(_apiUrl));
        if (response.statusCode == 200) {
          await pushCachedTransactionsManually();
        }
      } catch (_) {
        // do nothing on failure
      }
    }
  }

  Future<void> clearTransactions() async {
    _showStatus('Clearing all transactions...',
        color: Colors.blue, isLoading: true);

    _transactions = [];
    _expandedTransactionId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('transactions');

    _showStatus('All transactions cleared');
    notifyListeners();

    Future.delayed(const Duration(seconds: 2), () {
      clearStatus();
    });
  }
}
