import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/product.dart';

class EditProductViewModel extends ChangeNotifier {
  final Product product;

  late TextEditingController nameController;
  late TextEditingController priceController;

  late String selectedCategory;
  String? tempSelectedSize;
  String? tempSelectedColor;

  List<String> selectedSizes = [];
  List<String> selectedColors = [];

  List<String> availableCategories = [];
  List<String> availableSizes = [];
  List<String> availableColors = [];

  bool isLoading = false;
  bool isLoadingConfig = true;

  EditProductViewModel({required this.product}) {
    nameController = TextEditingController(text: product.name);
    priceController = TextEditingController(text: product.price.toString());
    selectedCategory = product.category;
    selectedSizes = List.from(product.sizes);
    selectedColors = List.from(product.colors);
  }

  Future<void> fetchConfigurations() async {
    try {
      final response =
          await http.get(Uri.parse("http://localhost:3000/api/configurations"));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        availableCategories = List<String>.from(data['categories'] ?? []);
        availableSizes = List<String>.from(data['sizes'] ?? []);
        availableColors = List<String>.from(data['colors'] ?? []);

        // Set default category if needed
        if (!availableCategories.contains(selectedCategory)) {
          selectedCategory =
              availableCategories.isNotEmpty ? availableCategories.first : '';
        }
      } else {
        debugPrint("Failed to load configurations");
      }
    } catch (e) {
      debugPrint("Error fetching configurations: $e");
    }

    isLoadingConfig = false;
    notifyListeners();
  }

  void updateCategory(String? category) {
    if (category == null) return;
    selectedCategory = category;
    notifyListeners();
  }

  void updateTempSize(String? size) {
    tempSelectedSize = size;
    notifyListeners();
  }

  void updateTempColor(String? color) {
    tempSelectedColor = color;
    notifyListeners();
  }

  void addSize(String size) {
    if (!selectedSizes.contains(size)) {
      selectedSizes.add(size);
      notifyListeners();
    }
  }

  void removeSize(String size) {
    selectedSizes.remove(size);
    notifyListeners();
  }

  void addColor(String color) {
    if (!selectedColors.contains(color)) {
      selectedColors.add(color);
      notifyListeners();
    }
  }

  void removeColor(String color) {
    selectedColors.remove(color);
    notifyListeners();
  }

  Future<bool> updateProduct() async {
    isLoading = true;
    notifyListeners();

    final url = Uri.parse('http://localhost:3000/api/products/${product.id}');

    try {
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'Name': nameController.text.trim(),
          'Category': selectedCategory,
          'Price': double.parse(priceController.text),
          'Size': selectedSizes,
          'Color': selectedColors,
        }),
      );

      isLoading = false;
      notifyListeners();

      return response.statusCode == 200;
    } catch (e) {
      isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void disposeControllers() {
    nameController.dispose();
    priceController.dispose();
  }
}
