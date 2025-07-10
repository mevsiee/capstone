import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/product.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];

  bool _isLoading = false;
  String _errorMessage = '';
  String _selectedCategory = 'All';

  // Public getters
  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  String get selectedCategory => _selectedCategory;

  List<String> get categories => [
        'All',
        'Tops',
        'Bottoms',
        'Dresses',
        'Outerwear',
        'Accessories',
        'Footwear',
      ];

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

  // Fetch product list from the API
  Future<void> fetchProducts() async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final url = Uri.parse('http://10.0.2.2:3000/api/products');

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

  // Add a new product to the list (local only; optional to add POST API)
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

  // Delete product from the list
  void deleteProduct(String productId) {
    _products.removeWhere((p) => p.id == productId);
    notifyListeners();
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
