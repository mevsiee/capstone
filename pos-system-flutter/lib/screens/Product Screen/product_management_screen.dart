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
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      Provider.of<ProductProvider>(context, listen: false).fetchProducts();
    });
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
                                      trailing: IconButton(
                                        icon: const Icon(Icons.edit),
                                        onPressed: () async {
                                          final updated = await Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) =>
                                                  EditProductScreen(
                                                      product: product),
                                            ),
                                          );
                                          if (updated != null) {
                                            provider.fetchProducts();
                                          }
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
        onPressed: () async {
          final result = await Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const AddProductScreen()),
          );

          if (result != null) {
            provider.fetchProducts();
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
