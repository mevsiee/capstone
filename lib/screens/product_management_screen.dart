import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/models/product.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/screens/add_product_screen.dart';
import 'package:pos_system/screens/edit_product_screen.dart';

class ProductManagementScreen extends StatefulWidget {
  const ProductManagementScreen({Key? key}) : super(key: key);

  @override
  State<ProductManagementScreen> createState() => _ProductManagementScreenState();
}

class _ProductManagementScreenState extends State<ProductManagementScreen> {
  String _selectedCategory = 'All';
  final List<String> _categories = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Footwear'];
  
  @override
  Widget build(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    
    // Filter products based on selected category
    final displayProducts = productProvider.getProductsByCategory(_selectedCategory);
    
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            const Text(
              'Product Management',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            // Category dropdown
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
            
            // Product list
            Expanded(
              child: displayProducts.isEmpty
                  ? const Center(
                      child: Text('No products found in this category'),
                    )
                  : ListView.builder(
                      itemCount: displayProducts.length,
                      itemBuilder: (context, index) {
                        final product = displayProducts[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8.0),
                          child: ListTile(
                            title: Text(product.name),
                            subtitle: Text('${product.category} - ₱${product.price.toStringAsFixed(2)}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit),
                                  onPressed: () {
                                    _navigateToEditProduct(product, productProvider);
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.red),
                                  onPressed: () {
                                    _deleteProduct(product, productProvider);
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
            // Add padding at the bottom to ensure the last item is not covered by the FAB
            const SizedBox(height: 80),
          ],
        ),
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 16.0),
        child: FloatingActionButton(
          onPressed: () => _navigateToAddProduct(productProvider),
          child: const Icon(Icons.add),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }

  Future<void> _navigateToAddProduct(ProductProvider productProvider) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const AddProductScreen(),
      ),
    );
    
    // Check if a product was returned
    if (result != null && result is Product) {
      productProvider.addProduct(result);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${result.name} has been added'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _navigateToEditProduct(Product product, ProductProvider productProvider) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => EditProductScreen(product: product),
      ),
    );
    
    // Check if an updated product was returned
    if (result != null && result is Product) {
      productProvider.updateProduct(result);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${result.name} has been updated'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  void _deleteProduct(Product product, ProductProvider productProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Are you sure you want to delete "${product.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              productProvider.deleteProduct(product.id);
              Navigator.of(context).pop();
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${product.name} has been deleted'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
