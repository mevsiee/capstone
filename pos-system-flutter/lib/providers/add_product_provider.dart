import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class AddProductViewModel extends ChangeNotifier {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController priceController = TextEditingController();

  List<String> availableCategories = [];
  List<String> availableSizes = [];
  List<String> availableColors = [];

  String selectedCategory = '';
  String? tempSelectedSize;
  String? tempSelectedColor;

  List<String> selectedSizes = [];
  List<String> selectedColors = [];

  bool isLoading = false;
  bool isConfigLoading = true;

  Future<void> fetchConfigurations() async {
    try {
      final response = await http
          .get(Uri.parse("http://192.168.244.121:3000/api/configurations"));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        availableCategories = List<String>.from(data['categories'] ?? []);
        availableSizes = List<String>.from(data['sizes'] ?? []);
        availableColors = List<String>.from(data['colors'] ?? []);
      }
    } catch (e) {
      debugPrint("Error fetching configurations: $e");
    }
    isConfigLoading = false;
    notifyListeners();
  }

  void updateCategory(String? category) {
    if (category != null) {
      selectedCategory = category;
      notifyListeners();
    }
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

  Future<bool> submitProduct() async {
    isLoading = true;
    notifyListeners();

    final url = Uri.parse('http://192.168.244.121:3000/api/products');

    try {
      final response = await http.post(
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
