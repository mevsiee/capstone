import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:pos_system/models/cart_item.dart';
import 'package:pos_system/models/product.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/models/staff.dart';

class CartProvider with ChangeNotifier {
  List<CartItem> _items = [];
  String _location = 'store'; // 'store' or 'warehouse'
  String? _editingItemId;
  String? _supervisorId;

  List<CartItem> get items => _items;
  String get location => _location;
  String? get editingItemId => _editingItemId;
  String? get supervisorId => _supervisorId;
  bool get isEmpty => _items.isEmpty;

  void setLocation(String location) {
    _location = location;
    notifyListeners();
  }
  
  void setSupervisor(String? id) {
    _supervisorId = id;
    notifyListeners();
  }

  void addItem({
    required String productId,
    required String size,
    required String color,
    required int quantity,
    double discount = 0,
    required ProductProvider productProvider,
  }) {
    // Get product from the provider instead of static data
    final product = productProvider.getProductById(productId);
    
    if (product == null) {
      print('Error: Product with ID $productId not found');
      return;
    }
    
    // Check for bulk pricing
    final bulkPricingInfo = _checkBulkPricing(product, quantity);
    
    // Apply discount to the price
    double finalPrice = bulkPricingInfo['price'] as double;
    
    final newItem = CartItem(
      id: const Uuid().v4(),
      productId: productId,
      productName: product.name,
      category: product.category,
      size: size,
      color: color,
      quantity: quantity,
      price: finalPrice,
      originalPrice: bulkPricingInfo['originalPrice'] as double,
      discount: discount,
      isBulkPricing: bulkPricingInfo['isBulkPricing'] as bool,
    );

    _items.add(newItem);
    notifyListeners();
  }

  void removeItem(String id) {
    _items.removeWhere((item) => item.id == id);
    
    if (_editingItemId == id) {
      _editingItemId = null;
    }
    
    notifyListeners();
  }

  void startEditing(String id) {
    _editingItemId = id;
    notifyListeners();
  }

  void stopEditing() {
    _editingItemId = null;
    notifyListeners();
  }

  void updateItem({
    required String id,
    required String productId,
    required String size,
    required String color,
    required int quantity,
    double discount = 0,
    required ProductProvider productProvider,
  }) {
    final index = _items.indexWhere((item) => item.id == id);
    if (index == -1) return;

    final product = productProvider.getProductById(productId);
    if (product == null) {
      print('Error: Product with ID $productId not found');
      return;
    }
    
    // Check for bulk pricing
    final bulkPricingInfo = _checkBulkPricing(product, quantity);
    
    // Apply discount to the price
    double finalPrice = bulkPricingInfo['price'] as double;
    
    _items[index] = CartItem(
      id: id,
      productId: productId,
      productName: product.name,
      category: product.category,
      size: size,
      color: color,
      quantity: quantity,
      price: finalPrice,
      originalPrice: bulkPricingInfo['originalPrice'] as double,
      discount: discount,
      isBulkPricing: bulkPricingInfo['isBulkPricing'] as bool,
    );

    _editingItemId = null;
    notifyListeners();
  }

  void clearCart() {
    _items = [];
    _editingItemId = null;
    notifyListeners();
  }

  double calculateSubtotal() {
    double total = 0.0;
    for (var item in _items) {
      total += (item.price * item.quantity);
    }
    return total;
  }

  double calculateTotalDiscount() {
    double totalDiscount = 0.0;
    for (var item in _items) {
      totalDiscount += item.discount;
    }
    return totalDiscount;
  }

  double calculateTotal() {
    return calculateSubtotal() - calculateTotalDiscount();
  }

  // Helper method to check and apply bulk pricing
  Map<String, dynamic> _checkBulkPricing(Product product, int quantity) {
    if (product.bulkPricing != null && quantity >= product.bulkPricing!.minQuantity) {
      return {
        'price': product.bulkPricing!.discountedPrice,
        'originalPrice': product.price,
        'isBulkPricing': true,
      };
    }
    
    return {
      'price': product.price,
      'originalPrice': product.price,
      'isBulkPricing': false,
    };
  }

  // Apply bulk pricing across variations for checkout
  List<CartItem> applyBulkPricingAcrossVariations(ProductProvider productProvider) {
    // Group items by productId
    final Map<String, List<CartItem>> productGroups = {};

    for (var item in _items) {
      if (!productGroups.containsKey(item.productId)) {
        productGroups[item.productId] = [];
      }
      productGroups[item.productId]!.add(item);
    }

    // Process each group
    final List<CartItem> processedItems = [];

    productGroups.forEach((productId, groupItems) {
      final product = productProvider.getProductById(productId);
      
      if (product != null && product.bulkPricing != null) {
        int totalQuantity = 0;
        for (var item in groupItems) {
          totalQuantity += item.quantity;
        }

        if (totalQuantity >= product.bulkPricing!.minQuantity) {
          // Apply bulk pricing to all items in this group
          for (var item in groupItems) {
            processedItems.add(item.copyWith(
              price: product.bulkPricing!.discountedPrice,
              originalPrice: product.price,
              isBulkPricing: true,
            ));
          }
        } else {
          // Regular pricing
          for (var item in groupItems) {
            processedItems.add(item.copyWith(
              price: product.price,
              originalPrice: product.price,
              isBulkPricing: false,
            ));
          }
        }
      } else {
        // No bulk pricing available
        processedItems.addAll(groupItems);
      }
    });

    return processedItems;
  }
}
