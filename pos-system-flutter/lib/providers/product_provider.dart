import 'package:flutter/material.dart';
import 'package:pos_system/models/product.dart';
import 'package:pos_system/data/products.dart' as product_data;

class ProductProvider with ChangeNotifier {
  List<Product> _products = [];

  List<Product> get products => _products;

  ProductProvider() {
    _loadProducts();
  }

  void _loadProducts() {
    // Load products from the static data
    _products = List<Product>.from(product_data.products);
    print('Loaded ${_products.length} products from data');
    notifyListeners();
  }

  void addProduct(Product product) {
    _products.add(product);
    print('Added new product: ${product.name}');
    notifyListeners();
  }

  void updateProduct(Product updatedProduct) {
    final index = _products.indexWhere((p) => p.id == updatedProduct.id);
    if (index != -1) {
      _products[index] = updatedProduct;
      notifyListeners();
    }
  }

  void deleteProduct(String id) {
    _products.removeWhere((p) => p.id == id);
    notifyListeners();
  }

  // Get products by category
  List<Product> getProductsByCategory(String category) {
    if (category == 'All') {
      return _products;
    }
    return _products.where((p) => p.category == category).toList();
  }

  // Get product by ID
  Product? getProductById(String id) {
    try {
      return _products.firstWhere((p) => p.id == id);
    } catch (e) {
      return null;
    }
  }
}
