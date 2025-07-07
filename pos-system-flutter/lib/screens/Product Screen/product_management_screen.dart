import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pos_system/models/product.dart';
import 'package:pos_system/screens/Product%20Screen/add_product_screen.dart';
import 'package:pos_system/screens/Product%20Screen/edit_product_screen.dart';

class ProductManagementScreen extends StatefulWidget {
  const ProductManagementScreen({Key? key}) : super(key: key);

  @override
  State<ProductManagementScreen> createState() =>
      _ProductManagementScreenState();
}

class _ProductManagementScreenState extends State<ProductManagementScreen> {
  String _selectedCategory = 'All';
  final List<String> _categories = [
    'All',
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Accessories',
    'Footwear'
  ];

  List<Product> _allProducts = [];
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  String getBaseUrl() {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    } else {
      return 'http://localhost:3000';
    }
  }

  Future<void> _fetchProducts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    final prefs = await SharedPreferences.getInstance();

    try {
      final response =
          await http.get(Uri.parse('${getBaseUrl()}/api/products'));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> jsonList = data['products'];

        final List<Product> loadedProducts = jsonList.map((jsonItem) {
          return Product(
            id: jsonItem['Product_ID']?.toString() ?? '',
            name: jsonItem['Name']?.toString() ?? '',
            category: jsonItem['Category']?.toString() ?? '',
            price: (jsonItem['Price'] ?? 0).toDouble(),
            colors: List<String>.from(jsonItem['Color'] ?? []),
            sizes: List<String>.from(jsonItem['Size'] ?? []),
          );
        }).toList();

        // ✅ Save to cache
        await prefs.setString('cached_products', jsonEncode(jsonList));

        setState(() {
          _allProducts = loadedProducts;
        });
      } else {
        _loadCachedProducts(prefs);
        setState(() {
          _errorMessage =
              'Failed to load products. Status code: ${response.statusCode}';
        });
      }
    } catch (e) {
      _loadCachedProducts(prefs);
      setState(() {
        _errorMessage = 'Failed to connect to API: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _loadCachedProducts(SharedPreferences prefs) {
    final cachedData = prefs.getString('cached_products');
    if (cachedData != null) {
      try {
        final List<dynamic> jsonList = jsonDecode(cachedData);
        final List<Product> cachedProducts = jsonList.map((jsonItem) {
          return Product(
            id: jsonItem['Product_ID']?.toString() ?? '',
            name: jsonItem['Name']?.toString() ?? '',
            category: jsonItem['Category']?.toString() ?? '',
            price: (jsonItem['Price'] ?? 0).toDouble(),
            colors: List<String>.from(jsonItem['Color'] ?? []),
            sizes: List<String>.from(jsonItem['Size'] ?? []),
          );
        }).toList();

        setState(() {
          _allProducts = cachedProducts;
        });
      } catch (e) {
        print('Failed to parse cached data: $e');
      }
    }
  }

  List<Product> get _filteredProducts {
    if (_selectedCategory == 'All') return _allProducts;
    return _allProducts.where((p) => p.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Management'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage.isNotEmpty
                ? Center(
                    child: Text(_errorMessage,
                        style: const TextStyle(color: Colors.red)))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButton<String>(
                        value: _selectedCategory,
                        isExpanded: true,
                        items: _categories.map((category) {
                          return DropdownMenuItem<String>(
                            value: category,
                            child: Text(category),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _selectedCategory = value;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _filteredProducts.isEmpty
                            ? const Center(child: Text('No products found.'))
                            : ListView.builder(
                                itemCount: _filteredProducts.length,
                                itemBuilder: (context, index) {
                                  final product = _filteredProducts[index];
                                  return Card(
                                    child: ListTile(
                                      title: Text(product.name),
                                      subtitle: Text(
                                          '${product.category} - ₱${product.price}'),
                                      trailing: IconButton(
                                        icon: const Icon(Icons.edit),
                                        onPressed: () {
                                          // Optional: Add edit functionality
                                        },
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                      const SizedBox(height: 80),
                    ],
                  ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToAddProduct(),
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _navigateToAddProduct() async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const AddProductScreen()),
    );

    if (result != null) {
      _fetchProducts();
    }
  }
}
