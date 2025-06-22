import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pos_system/models/product.dart';
import 'package:uuid/uuid.dart';

class AddProductDialog extends StatefulWidget {
  final Function(Product) onAddProduct;
  
  const AddProductDialog({
    Key? key,
    required this.onAddProduct,
  }) : super(key: key);

  @override
  State<AddProductDialog> createState() => _AddProductDialogState();
}

class _AddProductDialogState extends State<AddProductDialog> {
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  String _selectedCategory = '';
  final List<String> _categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Footwear'];
  
  final List<String> _selectedSizes = [];
  final List<String> _selectedColors = [];
  
  String _sizeInput = '';
  String _colorInput = '';
  
  final List<String> _commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'];
  final List<String> _commonColors = ['Black', 'White', 'Navy', 'Gray', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Maroon', 'Washed'];

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    return AlertDialog(
      contentPadding: const EdgeInsets.all(16.0),
      content: SizedBox(
        width: MediaQuery.of(context).size.width > 500 ? 500 : MediaQuery.of(context).size.width * 0.9,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with close button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Add New Product',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Fill in the details to add a new product to your inventory.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Name field
              const Text(
                'Name',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                decoration: InputDecoration(
                  hintText: 'Product name',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Category dropdown
              const Text(
                'Category',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedCategory.isNotEmpty ? _selectedCategory : null,
                decoration: InputDecoration(
                  hintText: 'Select category',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
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
                isDense: true,
                isExpanded: true,
              ),
              const SizedBox(height: 16),
              
              // Price field
              const Text(
                'Price (₱)',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _priceController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                ],
                decoration: InputDecoration(
                  hintText: '0.00',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              const Divider(),
              const SizedBox(height: 16),
              
              // Sizes section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Sizes',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _selectedSizes.isEmpty ? 'No sizes added' : '${_selectedSizes.length} sizes',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        hintText: 'Select or type size',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: _commonSizes.map((size) {
                        return DropdownMenuItem<String>(
                          value: size,
                          child: Text(size),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _sizeInput = value;
                          });
                        }
                      },
                      isDense: true,
                      isExpanded: true,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_sizeInput.isNotEmpty && !_selectedSizes.contains(_sizeInput)) {
                          setState(() {
                            _selectedSizes.add(_sizeInput);
                            _sizeInput = '';
                          });
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[400],
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Add'),
                    ),
                  ),
                ],
              ),
              if (_selectedSizes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _selectedSizes.map((size) {
                    return Chip(
                      label: Text(size),
                      deleteIcon: const Icon(Icons.close, size: 16),
                      onDeleted: () {
                        setState(() {
                          _selectedSizes.remove(size);
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 16),
              
              // Colors section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Colors',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _selectedColors.isEmpty ? 'No colors added' : '${_selectedColors.length} colors',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        hintText: 'Select or type color',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: _commonColors.map((color) {
                        return DropdownMenuItem<String>(
                          value: color,
                          child: Text(color),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _colorInput = value;
                          });
                        }
                      },
                      isDense: true,
                      isExpanded: true,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_colorInput.isNotEmpty && !_selectedColors.contains(_colorInput)) {
                          setState(() {
                            _selectedColors.add(_colorInput);
                            _colorInput = '';
                          });
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[400],
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Add'),
                    ),
                  ),
                ],
              ),
              if (_selectedColors.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _selectedColors.map((color) {
                    return Chip(
                      label: Text(color),
                      deleteIcon: const Icon(Icons.close, size: 16),
                      onDeleted: () {
                        setState(() {
                          _selectedColors.remove(color);
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 24),
              
              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _validateAndSave,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Add Product'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _validateAndSave() {
    // Validate inputs
    if (_nameController.text.isEmpty) {
      _showError('Please enter a product name');
      return;
    }
    
    if (_selectedCategory.isEmpty) {
      _showError('Please select a category');
      return;
    }
    
    if (_priceController.text.isEmpty) {
      _showError('Please enter a price');
      return;
    }
    
    final price = double.tryParse(_priceController.text);
    if (price == null || price <= 0) {
      _showError('Please enter a valid price');
      return;
    }
    
    if (_selectedSizes.isEmpty) {
      _showError('Please add at least one size');
      return;
    }
    
    if (_selectedColors.isEmpty) {
      _showError('Please add at least one color');
      return;
    }
    
    // Create new product
    final newProduct = Product(
      id: const Uuid().v4(),
      name: _nameController.text,
      category: _selectedCategory,
      sizes: _selectedSizes,
      colors: _selectedColors,
      price: price,
    );
    
    // Call the callback function
    widget.onAddProduct(newProduct);
    
    // Close the dialog
    Navigator.of(context).pop();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }
}
