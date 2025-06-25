import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:pos_system/models/staff.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pos_system/models/transaction.dart';
import 'package:pos_system/models/cart_item.dart';
import 'package:pos_system/data/staff.dart';

class TransactionProvider with ChangeNotifier {
  List<Transaction> _transactions = [];
  String? _expandedTransactionId;

  List<Transaction> get transactions => _transactions;
  String? get expandedTransactionId => _expandedTransactionId;

  TransactionProvider() {
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final transactionsJson = prefs.getString('transactions');
    
    if (transactionsJson != null) {
      try {
        final List<dynamic> decoded = json.decode(transactionsJson) as List<dynamic>;
        _transactions = decoded.map((item) => Transaction.fromJson(item as Map<String, dynamic>)).toList();
        notifyListeners();
      } catch (e) {
        print('Error loading transactions from preferences: $e');
      }
    }
  }

  Future<void> _saveTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final transactionsJson = json.encode(_transactions.map((t) => t.toJson()).toList());
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
    final date = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    
    // Find supervisor name if ID is provided
    String? supervisorName;
    if (supervisorId != null) {
      final supervisor = staffMembers.firstWhere(
        (staff) => staff.id == supervisorId,
        orElse: () => Staff(id: '', name: 'Unknown', position: ''),
      );
      supervisorName = supervisor.name;
    }
    
    final newTransaction = Transaction(
      id: "TRX-${(_transactions.length + 1).toString().padLeft(3, '0')}",
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

    _transactions.insert(0, newTransaction);
    await _saveTransactions();
    notifyListeners();
  }
  
  Future<void> clearTransactions() async {
    _transactions = [];
    _expandedTransactionId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('transactions');
    notifyListeners();
  }
}
