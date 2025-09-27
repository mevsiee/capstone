import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/product.dart';
import '../../providers/edit_product_provider.dart';

class EditProductScreen extends StatelessWidget {
  final Product product;
  const EditProductScreen({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          EditProductViewModel(product: product)..fetchConfigurations(),
      child: Scaffold(
        appBar: AppBar(title: const Text("Edit Product")),
        body: const _EditProductForm(),
      ),
    );
  }
}

class _EditProductForm extends StatelessWidget {
  const _EditProductForm();

  @override
  Widget build(BuildContext context) {
    final vm = Provider.of<EditProductViewModel>(context);
    final formKey = GlobalKey<FormState>();

    if (vm.isLoadingConfig) {
      return const Center(child: CircularProgressIndicator());
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: formKey,
        child: ListView(
          children: [
            _buildTitle("Name"),
            TextFormField(
              controller: vm.nameController,
              decoration: const InputDecoration(border: OutlineInputBorder()),
              validator: (val) =>
                  val == null || val.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            _buildTitle("Category"),
            DropdownButtonFormField<String>(
              value: vm.selectedCategory,
              items: vm.availableCategories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: vm.updateCategory,
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            _buildTitle("Price"),
            TextFormField(
              controller: vm.priceController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
              ],
              decoration: const InputDecoration(border: OutlineInputBorder()),
              validator: (val) => val == null || double.tryParse(val) == null
                  ? 'Invalid price'
                  : null,
            ),
            const SizedBox(height: 24),
            _buildTitle("Sizes"),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: null,
                    hint: const Text("Select size"),
                    items: vm.availableSizes
                        .where((s) => !vm.selectedSizes.contains(s))
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (size) {
                      if (size != null) vm.addSize(size);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildChips("Selected Sizes", vm.selectedSizes, vm.removeSize),
            const SizedBox(height: 16),
            _buildTitle("Colors"),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: null,
                    hint: const Text("Select color"),
                    items: vm.availableColors
                        .where((c) => !vm.selectedColors.contains(c))
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (color) {
                      if (color != null) vm.addColor(color);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildChips("Selected Colors", vm.selectedColors, vm.removeColor),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final success = await vm.updateProduct();
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Product updated")),
                  );
                  Navigator.of(context).pop(true);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Update failed"),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 50),
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
              ),
              child: const Text("Update Product"),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitle(String text) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(text, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
        ],
      );

  Widget _buildChips(
      String label, List<String> items, void Function(String) onRemove) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: items
              .map((e) => Chip(label: Text(e), onDeleted: () => onRemove(e)))
              .toList(),
        ),
      ],
    );
  }
}
