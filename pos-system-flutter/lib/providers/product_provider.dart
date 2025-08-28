import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import '../models/product.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];
  List<String> _categories = ['All'];
  bool _isLoading = false;
  String _errorMessage = '';
  String _selectedCategory = 'All';

  Database? _db;
  bool _dbInitialized = false;

  // Getters
  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  String get selectedCategory => _selectedCategory;
  List<String> get categories => _categories;

  List<Product> get filteredProducts {
    if (_selectedCategory == 'All') return _products;
    return _products.where((p) => p.category == _selectedCategory).toList();
  }

  Future<void> initDatabase() async {
    if (_dbInitialized) return;
    Directory dir = await getApplicationDocumentsDirectory();
    final path = join(dir.path, 'products.db');

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT,
            category TEXT,
            price REAL,
            colors TEXT,
            sizes TEXT
          )
        ''');
      },
    );
    _dbInitialized = true;
  }

  void changeCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> fetchConfigurations() async {
    _isLoading = true;
    notifyListeners();

    try {
      final url = Uri.parse('http://192.168.244.121:3000/api/configurations');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<String> fetchedCategories =
            List<String>.from(data['categories'] ?? []);
        _categories = ['All', ...fetchedCategories];
        _errorMessage = '';
      } else {
        _errorMessage = 'Failed to load configurations';
      }
    } catch (e) {
      _errorMessage = 'Error loading configurations: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchProducts() async {
    await initDatabase();
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final url = Uri.parse('http://192.168.244.121:3000/api/products');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> jsonList = data['products'];

        _products = jsonList.map((jsonItem) {
          return Product(
            id: jsonItem['Product_ID']?.toString() ?? '',
            name: jsonItem['Name']?.toString() ?? '',
            category: jsonItem['Category']?.toString() ?? '',
            price: (jsonItem['Price'] ?? 0).toDouble(),
            colors: List<String>.from(jsonItem['Color'] ?? []),
            sizes: List<String>.from(jsonItem['Size'] ?? []),
          );
        }).toList();

        await _cacheProductsToDB();
      } else {
        _errorMessage = 'Failed to load products from server';
        await _loadProductsFromDB();
      }
    } catch (e) {
      await _loadProductsFromDB();
      if (_products.isNotEmpty) {
        _errorMessage = ''; // Local fallback worked, no need to show error
      } else {
        _errorMessage = 'Error fetching products: $e';
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _cacheProductsToDB() async {
    if (_db == null) return;
    await _db!.delete('products');
    for (var product in _products) {
      await _db!.insert('products', {
        'id': product.id,
        'name': product.name,
        'category': product.category,
        'price': product.price,
        'colors': jsonEncode(product.colors),
        'sizes': jsonEncode(product.sizes),
      });
    }
  }

  Future<void> _loadProductsFromDB() async {
    if (_db == null) return;
    final result = await _db!.query('products');
    _products = result.map((row) {
      return Product(
        id: row['id'] as String,
        name: row['name'] as String,
        category: row['category'] as String,
        price: (row['price'] as num).toDouble(),
        colors: List<String>.from(jsonDecode(row['colors'] as String)),
        sizes: List<String>.from(jsonDecode(row['sizes'] as String)),
      );
    }).toList();
  }

  Future<void> addProduct(Product product) async {
    await initDatabase();
    _products.add(product);
    await _db?.insert('products', {
      'id': product.id,
      'name': product.name,
      'category': product.category,
      'price': product.price,
      'colors': jsonEncode(product.colors),
      'sizes': jsonEncode(product.sizes),
    });
    notifyListeners();
  }

  Future<void> updateProduct(Product updatedProduct) async {
    await initDatabase();
    final index = _products.indexWhere((p) => p.id == updatedProduct.id);
    if (index != -1) {
      _products[index] = updatedProduct;
      await _db?.update(
        'products',
        {
          'name': updatedProduct.name,
          'category': updatedProduct.category,
          'price': updatedProduct.price,
          'colors': jsonEncode(updatedProduct.colors),
          'sizes': jsonEncode(updatedProduct.sizes),
        },
        where: 'id = ?',
        whereArgs: [updatedProduct.id],
      );
      notifyListeners();
    }
  }

  Future<void> deleteProduct(String productId) async {
    final url =
        Uri.parse('http://192.168.244.121:3000/api/products/$productId');

    try {
      final response = await http.delete(url);

      if (response.statusCode == 200) {
        _products.removeWhere((p) => p.id == productId);
        await _db?.delete('products', where: 'id = ?', whereArgs: [productId]);
        notifyListeners();
      } else {
        throw Exception('Failed to delete product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting product: $e');
    }
  }

  Product? getProductById(String id) {
    try {
      return _products.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }
}
