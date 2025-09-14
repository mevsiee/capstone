import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/product.dart';
import '../../providers/product_provider.dart';
import 'package:pos_system/screens/Product%20Screen/add_product_screen.dart';
import 'package:pos_system/screens/Product%20Screen/edit_product_screen.dart';

class ProductManagementScreen extends StatefulWidget {
  const ProductManagementScreen({Key? key}) : super(key: key);

  @override
  State<ProductManagementScreen> createState() =>
      _ProductManagementScreenState();
}

class _ProductManagementScreenState extends State<ProductManagementScreen> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final provider = Provider.of<ProductProvider>(context, listen: false);
      provider.fetchConfigurations(); // Fetch dynamic categories
      // Only fetch products if not cached
      if (!provider.isProductsCached) {
        provider.fetchProducts();
      } else {
        provider.fetchProducts(forceRefresh: false); // Load from cache
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final provider = Provider.of<ProductProvider>(context, listen: false);
      // Only fetch products if not cached
      if (!provider.isProductsCached) {
        provider.fetchProducts();
      } else {
        provider.fetchProducts(forceRefresh: false); // Load from cache
      }
      _initialized = true;
    }
  }

  Future<void> _showDeleteConfirmationDialog(Product product) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Product'),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                Text('Are you sure you want to delete "${product.name}"?'),
                const SizedBox(height: 8),
                const Text(
                  'This action cannot be undone.',
                  style: TextStyle(
                    color: Colors.red,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text(
                'Cancel',
                style: TextStyle(color: Colors.black),
              ),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: const Text('Delete'),
              onPressed: () async {
                Navigator.of(context).pop();
                await _deleteProduct(product);
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _deleteProduct(Product product) async {
    final provider = Provider.of<ProductProvider>(context, listen: false);

    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      // Call the actual delete API
      await provider.deleteProduct(product.id);

      // Close loading dialog
      Navigator.of(context).pop();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product.name} deleted successfully'),
          backgroundColor: Colors.green,
        ),
      );

      // Refresh the product list
      await provider.fetchProducts(forceRefresh: true);
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to delete product: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<ProductProvider>(context);
    final isLoading = provider.isLoading;
    final errorMessage = provider.errorMessage;
    final selectedCategory = provider.selectedCategory;
    final filteredProducts = provider.filteredProducts;
    final categories = provider.categories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Products',
            onPressed: () {
              Provider.of<ProductProvider>(context, listen: false)
                  .fetchProducts(forceRefresh: true);
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : errorMessage.isNotEmpty
                ? Center(
                    child: Text(
                      errorMessage,
                      style: const TextStyle(color: Colors.red),
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButton<String>(
                        value: selectedCategory,
                        isExpanded: true,
                        items: categories.map((category) {
                          return DropdownMenuItem<String>(
                            value: category,
                            child: Text(category),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            provider.changeCategory(value);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: filteredProducts.isEmpty
                            ? const Center(child: Text('No products found.'))
                            : ListView.builder(
                                itemCount: filteredProducts.length,
                                itemBuilder: (context, index) {
                                  final product = filteredProducts[index];
                                  return Card(
                                    child: ListTile(
                                      title: Text(product.name),
                                      subtitle: Text(
                                          '${product.category} - ₱${product.price}'),
                                      trailing: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.edit),
                                            color: Colors.black,
                                            tooltip: 'Edit Product',
                                            onPressed: () async {
                                              final updated =
                                                  await Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) =>
                                                      EditProductScreen(
                                                          product: product),
                                                ),
                                              );
                                              if (updated != null) {
                                                provider.fetchProducts(
                                                    forceRefresh: true);
                                              }
                                            },
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete),
                                            color: Colors.red,
                                            tooltip: 'Delete Product',
                                            onPressed: () {
                                              _showDeleteConfirmationDialog(
                                                  product);
                                            },
                                          ),
                                        ],
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
        onPressed: () async {
          final result = await Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const AddProductScreen()),
          );
          if (result != null) {
            provider.fetchProducts(forceRefresh: true);
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
