import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pos_system/models/product.dart';

class EditProductScreen extends StatefulWidget {
  final Product product;

  const EditProductScreen({
    Key? key,
    required this.product,
  }) : super(key: key);

  @override
  State<EditProductScreen> createState() => _EditProductScreenState();
}

class _EditProductScreenState extends State<EditProductScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _priceController;
  late String _selectedCategory;
  final List<String> _categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Footwear'];
  
  late List<String> _selectedSizes;
  late List<String> _selectedColors;
  
  // Controllers for custom input
  final TextEditingController _customSizeController = TextEditingController();
  final TextEditingController _customColorController = TextEditingController();
  
  // Currently selected values from dropdowns
  String? _selectedSizeFromDropdown;
  String? _selectedColorFromDropdown;
  
  // Custom option identifiers
  static const String _customSizeOption = 'custom_size';
  static const String _customColorOption = 'custom_color';
  
  // Only letter sizes, no numbers
  final List<String> _commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  final List<String> _commonColors = ['Black', 'White', 'Navy', 'Gray', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Maroon'];
  
  // Flags to show custom input fields
  bool _showCustomSizeInput = false;
  bool _showCustomColorInput = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing product data
    _nameController = TextEditingController(text: widget.product.name);
    _priceController = TextEditingController(text: widget.product.price.toString());
    _selectedCategory = widget.product.category;
    _selectedSizes = List<String>.from(widget.product.sizes);
    _selectedColors = List<String>.from(widget.product.colors);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _customSizeController.dispose();
    _customColorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Product'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Description text
              Text(
                'Edit the details of ${widget.product.name}',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
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
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  hintText: 'Product name',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a product name';
                  }
                  return null;
                },
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
                value: _selectedCategory,
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
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please select a category';
                  }
                  return null;
                },
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
              TextFormField(
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
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a price';
                  }
                  final price = double.tryParse(value);
                  if (price == null || price <= 0) {
                    return 'Please enter a valid price';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              
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
                      value: _selectedSizeFromDropdown,
                      decoration: InputDecoration(
                        hintText: 'Select size',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: [
                        ..._commonSizes.map((size) {
                          return DropdownMenuItem<String>(
                            value: size,
                            child: Text(size),
                          );
                        }).toList(),
                        // Add custom size option
                        const DropdownMenuItem<String>(
                          value: _customSizeOption,
                          child: Text('Add Custom Size...', 
                            style: TextStyle(
                              fontStyle: FontStyle.italic,
                              color: Colors.blue,
                            ),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedSizeFromDropdown = value;
                          _showCustomSizeInput = value == _customSizeOption;
                          
                          // If a standard size is selected, we can enable the Add button
                          if (value != null && value != _customSizeOption) {
                            _customSizeController.clear();
                          }
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: ElevatedButton(
                      onPressed: (_selectedSizeFromDropdown != null && _selectedSizeFromDropdown != _customSizeOption) || 
                                (_showCustomSizeInput && _customSizeController.text.isNotEmpty)
                          ? () {
                              String sizeToAdd;
                              
                              if (_showCustomSizeInput) {
                                sizeToAdd = _customSizeController.text.trim();
                              } else {
                                sizeToAdd = _selectedSizeFromDropdown!;
                              }
                              
                              if (sizeToAdd.isNotEmpty && !_selectedSizes.contains(sizeToAdd)) {
                                setState(() {
                                  _selectedSizes.add(sizeToAdd);
                                  _selectedSizeFromDropdown = null;
                                  _customSizeController.clear();
                                  _showCustomSizeInput = false;
                                });
                              } else if (_selectedSizes.contains(sizeToAdd)) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Size "$sizeToAdd" already added'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: (_selectedSizeFromDropdown != null && _selectedSizeFromDropdown != _customSizeOption) || 
                                        (_showCustomSizeInput && _customSizeController.text.isNotEmpty)
                            ? Colors.black
                            : Colors.grey[400],
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey[400],
                        disabledForegroundColor: Colors.white,
                      ),
                      child: const Text('Add'),
                    ),
                  ),
                ],
              ),
              // Custom size input field (shown conditionally)
              if (_showCustomSizeInput) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _customSizeController,
                  decoration: InputDecoration(
                    hintText: 'Enter custom size',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onChanged: (value) {
                    // Force a rebuild to update the Add button state
                    setState(() {});
                  },
                ),
              ],
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
                      value: _selectedColorFromDropdown,
                      decoration: InputDecoration(
                        hintText: 'Select color',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: [
                        ..._commonColors.map((color) {
                          return DropdownMenuItem<String>(
                            value: color,
                            child: Text(color),
                          );
                        }).toList(),
                        // Add custom color option
                        const DropdownMenuItem<String>(
                          value: _customColorOption,
                          child: Text('Add Custom Color...', 
                            style: TextStyle(
                              fontStyle: FontStyle.italic,
                              color: Colors.blue,
                            ),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedColorFromDropdown = value;
                          _showCustomColorInput = value == _customColorOption;
                          
                          // If a standard color is selected, we can enable the Add button
                          if (value != null && value != _customColorOption) {
                            _customColorController.clear();
                          }
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 80,
                    child: ElevatedButton(
                      onPressed: (_selectedColorFromDropdown != null && _selectedColorFromDropdown != _customColorOption) || 
                                (_showCustomColorInput && _customColorController.text.isNotEmpty)
                          ? () {
                              String colorToAdd;
                              
                              if (_showCustomColorInput) {
                                colorToAdd = _customColorController.text.trim();
                              } else {
                                colorToAdd = _selectedColorFromDropdown!;
                              }
                              
                              if (colorToAdd.isNotEmpty && !_selectedColors.contains(colorToAdd)) {
                                setState(() {
                                  _selectedColors.add(colorToAdd);
                                  _selectedColorFromDropdown = null;
                                  _customColorController.clear();
                                  _showCustomColorInput = false;
                                });
                              } else if (_selectedColors.contains(colorToAdd)) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Color "$colorToAdd" already added'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: (_selectedColorFromDropdown != null && _selectedColorFromDropdown != _customColorOption) || 
                                        (_showCustomColorInput && _customColorController.text.isNotEmpty)
                            ? Colors.black
                            : Colors.grey[400],
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey[400],
                        disabledForegroundColor: Colors.white,
                      ),
                      child: const Text('Add'),
                    ),
                  ),
                ],
              ),
              // Custom color input field (shown conditionally)
              if (_showCustomColorInput) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _customColorController,
                  decoration: InputDecoration(
                    hintText: 'Enter custom color',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onChanged: (value) {
                    // Force a rebuild to update the Add button state
                    setState(() {});
                  },
                ),
              ],
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
              const SizedBox(height: 32),
              
              // Update Product button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _validateAndSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text(
                    'Update Product',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _validateAndSave() {
    if (!_formKey.currentState!.validate()) {
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
    
    // Create updated product with the same ID
    final updatedProduct = Product(
      id: widget.product.id,
      name: _nameController.text,
      category: _selectedCategory,
      sizes: _selectedSizes,
      colors: _selectedColors,
      price: double.parse(_priceController.text),
      bulkPricing: widget.product.bulkPricing, // Preserve existing bulk pricing
    );
    
    // Return the updated product to the previous screen
    Navigator.of(context).pop(updatedProduct);
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
