import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:pos_system/models/staff.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pos_system/models/transaction.dart';
import 'package:pos_system/models/cart_item.dart';
import 'package:pos_system/data/staff.dart';
import 'package:http/http.dart' as http;

String generateCustomTransactionId() {
  final millis = DateTime.now().millisecondsSinceEpoch;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  final rand = Random();
  final randomPart =
      List.generate(5, (index) => chars[rand.nextInt(chars.length)]).join();
  return 'TRX-$millis-$randomPart';
}

class TransactionProvider with ChangeNotifier {
  List<Transaction> _transactions = [];
  String? _expandedTransactionId;

  List<Transaction> get transactions => _transactions;
  String? get expandedTransactionId => _expandedTransactionId;

  TransactionProvider() {
    fetchTransactions();
  }

  Future<void> fetchTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedTransactions = prefs.getString('transactions');

    try {
      final url = Uri.parse('http://localhost:3000/api/transactions');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _transactions = data.map((item) => Transaction.fromJson(item)).toList();
        await _cacheTransactions();
      } else {
        if (cachedTransactions != null) {
          _transactions = (json.decode(cachedTransactions) as List)
              .map((item) => Transaction.fromJson(item))
              .toList();
        }
      }
    } catch (e) {
      if (cachedTransactions != null) {
        _transactions = (json.decode(cachedTransactions) as List)
            .map((item) => Transaction.fromJson(item))
            .toList();
      }
    }

    notifyListeners();
  }

  Future<void> _cacheTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final transactionsJson =
        json.encode(_transactions.map((t) => t.toJson()).toList());
    await prefs.setString('transactions', transactionsJson);
  }

  void toggleExpandTransaction(String id) {
    if (_expandedTransactionId == id) {
      _expandedTransactionId = null;
    } else {
      _expandedTransactionId = id;
    }
    notifyListeners();
  }

  Future<void> addTransaction({
    required List<CartItem> items,
    required String location,
    required double subtotal,
    required double discount,
    required double total,
    required String employee,
    String? supervisorId,
  }) async {
    final now = DateTime.now();
    final date =
        "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";

    String? supervisorName;
    if (supervisorId != null) {
      final supervisor = staffMembers.firstWhere(
        (staff) => staff.id == supervisorId,
        orElse: () => Staff(id: '', name: 'Unknown', position: ''),
      );
      supervisorName = supervisor.name;
    }

    final transactionId = generateCustomTransactionId();

    final tempTransaction = Transaction(
      id: transactionId,
      date: date,
      location: location == 'store' ? 'Store' : 'Warehouse',
      items: items,
      subtotal: subtotal,
      discount: discount,
      total: total,
      employee: employee,
      supervisorId: supervisorId,
      supervisorName: supervisorName,
      timestamp: now.toIso8601String(),
    );

    try {
      final url = Uri.parse('http://localhost:3000/api/transactions');
      print('📤 Posting transaction: ${json.encode(tempTransaction.toJson())}');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(tempTransaction.toJson()),
      );

      print('✅ Response status: ${response.statusCode}');
      print('✅ Response body: ${response.body}');

      if (response.statusCode == 201) {
        _transactions.insert(0, tempTransaction);
        await _cacheTransactions();
        notifyListeners();
      } else {
        throw Exception('Failed to add transaction');
      }
    } catch (e) {
      print('❌ Error adding transaction: $e');
    }
  }

  Future<void> clearTransactions() async {
    _transactions = [];
    _expandedTransactionId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('transactions');
    notifyListeners();
  }
}
