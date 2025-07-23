import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/product.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];
  List<String> _categories = [
    'All'
  ]; // Start with 'All', then append API values.

  bool _isLoading = false;
  String _errorMessage = '';
  String _selectedCategory = 'All';

  // Public getters
  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  String get selectedCategory => _selectedCategory;
  List<String> get categories => _categories;

  // Filtered product list based on selected category
  List<Product> get filteredProducts {
    if (_selectedCategory == 'All') return _products;
    return _products.where((p) => p.category == _selectedCategory).toList();
  }

  // Update selected category
  void changeCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  /// ✅ Fetch categories from /api/configurations
  Future<void> fetchConfigurations() async {
    try {
      final url = Uri.parse('http://192.168.254.113:3000/api/configurations');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        final List<String> fetchedCategories =
            List<String>.from(data['categories'] ?? []);
        _categories = ['All', ...fetchedCategories];
        notifyListeners();
      } else {
        _errorMessage = 'Failed to load configurations';
        notifyListeners();
      }
    } catch (e) {
      _errorMessage = 'Error loading configurations: $e';
      notifyListeners();
    }
  }

  // Fetch product list from the API
  Future<void> fetchProducts() async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final url = Uri.parse('http://192.168.254.113:3000/api/products');
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
      } else {
        _errorMessage = 'Failed to load products: ${response.statusCode}';
      }
    } catch (e) {
      _errorMessage = 'Error loading products: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  // Add a new product to the list
  void addProduct(Product product) {
    _products.add(product);
    notifyListeners();
  }

  // Update an existing product by ID
  void updateProduct(Product updatedProduct) {
    final index = _products.indexWhere((p) => p.id == updatedProduct.id);
    if (index != -1) {
      _products[index] = updatedProduct;
      notifyListeners();
    }
  }

  // 🔥 API-based delete product
  Future<void> deleteProduct(String productId) async {
    final url =
        Uri.parse('http://192.168.254.113:3000/api/products/$productId');

    try {
      final response = await http.delete(url);

      if (response.statusCode == 200) {
        _products.removeWhere((p) => p.id == productId);
        notifyListeners();
      } else {
        throw Exception('Failed to delete product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting product: $e');
    }
  }

  // Optional: Get product by ID
  Product? getProductById(String id) {
    try {
      return _products.firstWhere((p) => p.id == id);
    } catch (e) {
      return null;
    }
  }
}
