import 'dart:convert';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:pos_system/models/transaction.dart' as model;

class LocalDBHelper {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  static Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'transactions.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE transactions (
            id TEXT PRIMARY KEY,
            data TEXT
          )
        ''');
      },
    );
  }

  static Future<void> insertTransaction(model.Transaction transaction) async {
    final db = await database;
    await db.insert(
      'transactions',
      {'id': transaction.id, 'data': jsonEncode(transaction.toJson())},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<model.Transaction>> getCachedTransactions() async {
    final db = await database;
    final result = await db.query('transactions');

    return result.map((row) {
      final data = jsonDecode(row['data'] as String);
      return model.Transaction.fromJson(data);
    }).toList();
  }

  static Future<void> clearCachedTransactions() async {
    final db = await database;
    await db.delete('transactions');
  }

  static Future<int> getCachedCount() async {
    final db = await database;
    return Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM transactions'),
        ) ??
        0;
  }
}
