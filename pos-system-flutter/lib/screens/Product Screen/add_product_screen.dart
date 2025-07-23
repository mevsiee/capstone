import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/add_product_provider.dart';

class AddProductScreen extends StatelessWidget {
  const AddProductScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AddProductViewModel()..fetchConfigurations(),
      child: const _AddProductForm(),
    );
  }
}

class _AddProductForm extends StatefulWidget {
  const _AddProductForm({Key? key}) : super(key: key);

  @override
  State<_AddProductForm> createState() => _AddProductFormState();
}

class _AddProductFormState extends State<_AddProductForm> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    final vm = Provider.of<AddProductViewModel>(context);

    if (vm.isConfigLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Product'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Product Name'),
              const SizedBox(height: 8),
              TextFormField(
                controller: vm.nameController,
                decoration: const InputDecoration(
                  hintText: 'Enter product name',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              const Text('Category'),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value:
                    vm.selectedCategory.isNotEmpty ? vm.selectedCategory : null,
                items: vm.availableCategories.map((cat) {
                  return DropdownMenuItem(value: cat, child: Text(cat));
                }).toList(),
                onChanged: vm.updateCategory,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Select a category' : null,
              ),
              const SizedBox(height: 16),
              const Text('Price (₱)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: vm.priceController,
                keyboardType: TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  hintText: 'Enter price',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final price = double.tryParse(value ?? '');
                  if (price == null || price <= 0) {
                    return 'Enter valid price';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Sizes', vm.selectedSizes),
              _buildMultiSelect(vm.availableSizes, vm.selectedSizes, vm.addSize,
                  vm.removeSize),
              const SizedBox(height: 24),
              _buildSectionHeader('Colors', vm.selectedColors),
              _buildMultiSelect(vm.availableColors, vm.selectedColors,
                  vm.addColor, vm.removeColor),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: vm.isLoading
                      ? null
                      : () async {
                          if (_formKey.currentState?.validate() ?? false) {
                            if (vm.selectedSizes.isEmpty ||
                                vm.selectedColors.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                      'Please select at least one size and one color.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }

                            final success = await vm.submitProduct();
                            if (success && mounted) {
                              Navigator.pop(context, true);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Failed to add product.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: vm.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Add Product',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, List<String> selected) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        Text(
          selected.isEmpty ? 'None selected' : '${selected.length} selected',
          style: TextStyle(color: Colors.grey[600]),
        ),
      ],
    );
  }

  Widget _buildMultiSelect(
    List<String> options,
    List<String> selectedList,
    Function(String) onAdd,
    Function(String) onRemove,
  ) {
    return Column(
      children: [
        Wrap(
          spacing: 8,
          children: options.map((item) {
            final isSelected = selectedList.contains(item);
            return FilterChip(
              label: Text(item),
              selected: isSelected,
              onSelected: (selected) => selected ? onAdd(item) : onRemove(item),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: selectedList.map((item) {
            return Chip(
              label: Text(item),
              onDeleted: () => onRemove(item),
            );
          }).toList(),
        ),
      ],
    );
  }
}
