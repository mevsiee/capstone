import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/models/product.dart';

class ProductForm extends StatefulWidget {
  final Function(String, String, String, int, double) onAddToCart;
  final Function(String, String, String, String, int, double)? onUpdateCart;

  const ProductForm({
    Key? key,
    required this.onAddToCart,
    this.onUpdateCart,
  }) : super(key: key);

  @override
  State<ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<ProductForm> {
  String _selectedProductId = '';
  String _selectedSize = '';
  String _selectedColor = '';
  int _quantity = 1;
  double _discount = 0;

  final _formKey = GlobalKey<FormState>();

  List<String> _availableSizes = [];
  List<String> _availableColors = [];

  // Red asterisk widget for required fields
  Widget _requiredAsterisk() {
    return const Text(
      ' *',
      style: TextStyle(
        color: Colors.red,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final cartProvider = Provider.of<CartProvider>(context);
    final editingItemId = cartProvider.editingItemId;

    // If we're editing an item, populate the form
    if (editingItemId != null && _selectedProductId.isEmpty) {
      final editingItem =
          cartProvider.items.firstWhere((item) => item.id == editingItemId);
      setState(() {
        _selectedProductId = editingItem.productId;
        _selectedSize = editingItem.size;
        _selectedColor = editingItem.color;
        _quantity = editingItem.quantity;
        _discount = editingItem.discount;
        _updateAvailableSizesAndColors();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final productProvider = Provider.of<ProductProvider>(context);
    final editingItemId = cartProvider.editingItemId;
    // Get all products from the provider
    final allProducts = productProvider.products;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product selection
              const Text(
                'Add Product',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Text('Product'),
                  _requiredAsterisk(),
                ],
              ),
              const SizedBox(height: 8),

              // Product grid
              Container(
                height: 250, // Fixed height for the grid
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: allProducts.isEmpty
                    ? const Center(
                        child: Text(
                          'No products available',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(4),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4, // 3 columns like in the image
                          crossAxisSpacing: 4,
                          mainAxisSpacing: 4,
                          childAspectRatio: 1, // Square cards
                        ),
                        itemCount: allProducts.length,
                        itemBuilder: (context, index) {
                          final product = allProducts[index];
                          final isSelected = _selectedProductId == product.id;

                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedProductId = product.id;
                                _selectedSize = '';
                                _selectedColor = '';
                                _updateAvailableSizesAndColors();
                              });
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? Colors.green.shade50
                                    : Colors.white,
                                border: Border.all(
                                  color: isSelected
                                      ? Colors.green
                                      : Colors.grey.shade300,
                                  width: isSelected ? 2 : 1,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // Product name
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 2),
                                    child: Text(
                                      product.name.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected
                                            ? Colors.green.shade700
                                            : Colors.black87,
                                      ),
                                      textAlign: TextAlign.center,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  // Price
                                  Text(
                                    '₱${product.price.toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: isSelected
                                          ? Colors.green.shade600
                                          : Colors.grey.shade600,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),

              // Validation message for product selection
              if (_selectedProductId.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 8.0),
                  child: Text(
                    'Please select a product',
                    style: TextStyle(
                      color: Colors.red,
                      fontSize: 12,
                    ),
                  ),
                ),

              const SizedBox(height: 16),

              // Size and Color dropdowns with red asterisks
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('Size'),
                            _requiredAsterisk(),
                          ],
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                          ),
                          value:
                              _selectedSize.isNotEmpty ? _selectedSize : null,
                          items: _availableSizes.map((size) {
                            return DropdownMenuItem<String>(
                              value: size,
                              child: Text(size),
                            );
                          }).toList(),
                          onChanged: _availableSizes.isEmpty
                              ? null
                              : (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedSize = value;
                                    });
                                  }
                                },
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('Color'),
                            _requiredAsterisk(),
                          ],
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                          ),
                          value:
                              _selectedColor.isNotEmpty ? _selectedColor : null,
                          items: _availableColors.map((color) {
                            return DropdownMenuItem<String>(
                              value: color,
                              child: Text(color),
                            );
                          }).toList(),
                          onChanged: _availableColors.isEmpty
                              ? null
                              : (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedColor = value;
                                    });
                                  }
                                },
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Price, Quantity, and Discount
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Unit Price display
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Unit Price'),
                        const SizedBox(height: 8),
                        Container(
                          height: 56,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          alignment: Alignment.centerLeft,
                          child: Text(
                            _selectedProductId.isNotEmpty
                                ? '₱${_getProductPrice(productProvider).toStringAsFixed(2)}'
                                : '',
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Quantity input with red asterisk
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('Quantity'),
                            _requiredAsterisk(),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 56,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            children: [
                              // Decrease button
                              SizedBox(
                                width: 23,
                                height: 56,
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: _quantity > 1
                                        ? () {
                                            setState(() {
                                              _quantity--;
                                            });
                                          }
                                        : null,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: _quantity > 1
                                            ? Colors.red.shade50
                                            : Colors.grey.shade100,
                                        borderRadius: const BorderRadius.only(
                                          topLeft: Radius.circular(4),
                                          bottomLeft: Radius.circular(4),
                                        ),
                                      ),
                                      child: Icon(
                                        Icons.remove,
                                        color: _quantity > 1
                                            ? Colors.red
                                            : Colors.grey,
                                        size: 14,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              // Quantity display
                              Expanded(
                                child: Container(
                                  height: 56,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.symmetric(
                                      vertical: BorderSide(
                                          color: Colors.grey.shade300),
                                    ),
                                  ),
                                  child: Text(
                                    _quantity.toString(),
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ),
                              // Increase button
                              SizedBox(
                                width: 23,
                                height: 56,
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: () {
                                      setState(() {
                                        _quantity++;
                                      });
                                    },
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade50,
                                        borderRadius: const BorderRadius.only(
                                          topRight: Radius.circular(4),
                                          bottomRight: Radius.circular(4),
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.add,
                                        color: Colors.green,
                                        size: 14,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Discount input
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Discount'),
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: _discount.toString(),
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Enter discount amount',
                          ),
                          onChanged: (value) {
                            setState(() {
                              _discount = double.tryParse(value) ?? 0;
                            });
                          },
                          validator: (value) {
                            if (value != null && value.isNotEmpty) {
                              final parsedValue = double.tryParse(value);
                              if (parsedValue == null || parsedValue < 0) {
                                return 'Invalid';
                              }

                              // Check if discount is greater than total price
                              if (_selectedProductId.isNotEmpty) {
                                final totalPrice =
                                    _getProductPrice(productProvider) *
                                        _quantity;
                                if (parsedValue > totalPrice) {
                                  return 'Discount too high';
                                }
                              }
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              if (_selectedProductId.isNotEmpty &&
                  _getProductBulkPricing(productProvider) != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 14,
                        color: Colors.amber[700],
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'BULK PRICING AVAILABLE: Buy ${_getProductBulkPricing(productProvider)!.minQuantity}+ items: ₱${_getProductBulkPricing(productProvider)!.discountedPrice.toStringAsFixed(2)} each',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.amber[800],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              if (_selectedProductId.isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        '₱${_calculateTotal(productProvider).toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                ),

              if (_selectedProductId.isNotEmpty) const SizedBox(height: 16),

              // Add/Update button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _selectedProductId.isEmpty ||
                          _selectedSize.isEmpty ||
                          _selectedColor.isEmpty
                      ? null
                      : () {
                          if (_formKey.currentState!.validate()) {
                            if (editingItemId != null &&
                                widget.onUpdateCart != null) {
                              // Update existing item
                              widget.onUpdateCart!(
                                editingItemId,
                                _selectedProductId,
                                _selectedSize,
                                _selectedColor,
                                _quantity,
                                _discount,
                              );

                              // Show success message
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Item updated successfully!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              // Add new item
                              widget.onAddToCart(
                                _selectedProductId,
                                _selectedSize,
                                _selectedColor,
                                _quantity,
                                _discount,
                              );

                              // Show success message
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Item added to cart!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }

                            // Reset form
                            setState(() {
                              _selectedProductId = '';
                              _selectedSize = '';
                              _selectedColor = '';
                              _quantity = 1;
                              _discount = 0;
                              _availableSizes = [];
                              _availableColors = [];
                            });

                            // Clear editing state
                            if (editingItemId != null) {
                              cartProvider.stopEditing();
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                  ),
                  child: Text(
                    editingItemId != null ? 'Update Item' : 'Add to Order',
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _updateAvailableSizesAndColors() {
    if (_selectedProductId.isEmpty) {
      _availableSizes = [];
      _availableColors = [];
      return;
    }

    final productProvider =
        Provider.of<ProductProvider>(context, listen: false);
    final product = productProvider.getProductById(_selectedProductId);

    if (product != null) {
      _availableSizes = List<String>.from(product.sizes);
      _availableColors = List<String>.from(product.colors);
    } else {
      _availableSizes = [];
      _availableColors = [];
    }
  }

  double _getProductPrice(ProductProvider productProvider) {
    if (_selectedProductId.isEmpty) return 0;

    final product = productProvider.getProductById(_selectedProductId);
    return product?.price ?? 0;
  }

  BulkPricing? _getProductBulkPricing(ProductProvider productProvider) {
    if (_selectedProductId.isEmpty) return null;

    final product = productProvider.getProductById(_selectedProductId);
    return product?.bulkPricing;
  }

  double _calculateTotal(ProductProvider productProvider) {
    if (_selectedProductId.isEmpty) return 0;

    final unitPrice = _getProductPrice(productProvider);
    final subtotal = unitPrice * _quantity;
    final total = subtotal - _discount;

    // Ensure total is not negative
    return total < 0 ? 0 : total;
  }
}
