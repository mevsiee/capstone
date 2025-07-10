import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:pos_system/models/product.dart';

class EditProductScreen extends StatefulWidget {
  final Product product;

  const EditProductScreen({Key? key, required this.product}) : super(key: key);

  @override
  State<EditProductScreen> createState() => _EditProductScreenState();
}

class _EditProductScreenState extends State<EditProductScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _priceController;
  late String _selectedCategory;
  late List<String> _selectedSizes;
  late List<String> _selectedColors;

  final List<String> _categories = [
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Accessories',
    'Footwear'
  ];
  final List<String> _commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  final List<String> _commonColors = [
    'Black',
    'White',
    'Navy',
    'Gray',
    'Blue',
    'Red',
    'Green',
    'Yellow',
    'Pink',
    'Maroon'
  ];

  final TextEditingController _customSizeController = TextEditingController();
  final TextEditingController _customColorController = TextEditingController();

  String? _selectedSizeFromDropdown;
  String? _selectedColorFromDropdown;

  bool _showCustomSizeInput = false;
  bool _showCustomColorInput = false;

  static const String _customSizeOption = 'custom_size';
  static const String _customColorOption = 'custom_color';

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.product.name);
    _priceController =
        TextEditingController(text: widget.product.price.toString());
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

  Future<void> _updateProduct() async {
    final url = Uri.parse(
        'http://10.0.2.2:3000/api/products/${widget.product.id}'); // Use correct IP here

    try {
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'Name': _nameController.text.trim(),
          'Category': _selectedCategory,
          'Price': double.parse(_priceController.text),
          'Size': _selectedSizes,
          'Color': _selectedColors,
        }),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Product updated successfully')),
        );
        Navigator.of(context).pop(true); // Return success flag
      } else {
        throw Exception('Failed to update product: ${response.body}');
      }
    } catch (e) {
      print('Update error: $e');
      _showError('Update failed. Please check your connection or server.');
    }
  }

  void _validateAndSave() {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedSizes.isEmpty) {
      _showError('Please add at least one size');
      return;
    }

    if (_selectedColors.isEmpty) {
      _showError('Please add at least one color');
      return;
    }

    _updateProduct();
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Product')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              _buildTitle('Name'),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Product name',
                ),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Enter a name' : null,
              ),
              const SizedBox(height: 16),
              _buildTitle('Category'),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(border: OutlineInputBorder()),
                items: _categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (val) => setState(() => _selectedCategory = val!),
              ),
              const SizedBox(height: 16),
              _buildTitle('Price (₱)'),
              TextFormField(
                controller: _priceController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                ],
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: '0.00',
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Enter a price';
                  final price = double.tryParse(val);
                  if (price == null || price <= 0) {
                    return 'Enter a valid price';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              _buildMultiSelect(
                label: 'Sizes',
                options: _commonSizes,
                selectedItems: _selectedSizes,
                selectedValue: _selectedSizeFromDropdown,
                customController: _customSizeController,
                customOption: _customSizeOption,
                showCustomInput: _showCustomSizeInput,
                onChanged: (val) {
                  setState(() {
                    _selectedSizeFromDropdown = val;
                    _showCustomSizeInput = val == _customSizeOption;
                    if (val != _customSizeOption) {
                      _customSizeController.clear();
                    }
                  });
                },
                onAdd: (String value) {
                  if (!_selectedSizes.contains(value)) {
                    setState(() {
                      _selectedSizes.add(value);
                      _selectedSizeFromDropdown = null;
                      _customSizeController.clear();
                      _showCustomSizeInput = false;
                    });
                  }
                },
                onRemove: (item) {
                  setState(() => _selectedSizes.remove(item));
                },
              ),
              const SizedBox(height: 24),
              _buildMultiSelect(
                label: 'Colors',
                options: _commonColors,
                selectedItems: _selectedColors,
                selectedValue: _selectedColorFromDropdown,
                customController: _customColorController,
                customOption: _customColorOption,
                showCustomInput: _showCustomColorInput,
                onChanged: (val) {
                  setState(() {
                    _selectedColorFromDropdown = val;
                    _showCustomColorInput = val == _customColorOption;
                    if (val != _customColorOption) {
                      _customColorController.clear();
                    }
                  });
                },
                onAdd: (String value) {
                  if (!_selectedColors.contains(value)) {
                    setState(() {
                      _selectedColors.add(value);
                      _selectedColorFromDropdown = null;
                      _customColorController.clear();
                      _showCustomColorInput = false;
                    });
                  }
                },
                onRemove: (item) {
                  setState(() => _selectedColors.remove(item));
                },
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _validateAndSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: const Text(
                  'Update Product',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTitle(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildMultiSelect({
    required String label,
    required List<String> options,
    required List<String> selectedItems,
    required String? selectedValue,
    required TextEditingController customController,
    required String customOption,
    required bool showCustomInput,
    required void Function(String?) onChanged,
    required void Function(String) onAdd,
    required void Function(String) onRemove,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTitle(label),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: selectedValue,
                decoration: const InputDecoration(border: OutlineInputBorder()),
                items: [
                  ...options
                      .map((opt) => DropdownMenuItem(
                          value: opt, child: Text(opt)))
                      .toList(),
                  DropdownMenuItem(
                    value: customOption,
                    child: Text('Add Custom...',
                        style: const TextStyle(
                            fontStyle: FontStyle.italic, color: Colors.blue)),
                  ),
                ],
                onChanged: onChanged,
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: (selectedValue != null &&
                          selectedValue != customOption) ||
                      (showCustomInput && customController.text.isNotEmpty)
                  ? () {
                      final item = showCustomInput
                          ? customController.text.trim()
                          : selectedValue!;
                      if (item.isNotEmpty) onAdd(item);
                    }
                  : null,
              child: const Text('Add'),
            ),
          ],
        ),
        if (showCustomInput)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: TextField(
              controller: customController,
              decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Enter custom value'),
              onChanged: (_) => setState(() {}),
            ),
          ),
        if (selectedItems.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Wrap(
              spacing: 8,
              children: selectedItems
                  .map((item) => Chip(
                        label: Text(item),
                        onDeleted: () => onRemove(item),
                      ))
                  .toList(),
            ),
          ),
      ],
    );
  }
}
