import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/transaction_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/providers/staff_provider.dart';
import 'package:pos_system/widgets/product_form.dart';
import 'package:pos_system/widgets/cart_summary.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({Key? key}) : super(key: key);

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen>
    with AutomaticKeepAliveClientMixin {
  final _formKey = GlobalKey<FormState>();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      Provider.of<StaffProvider>(context, listen: false).fetchStaff();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cartProvider = context.watch<CartProvider>();
    final transactionProvider = context.watch<TransactionProvider>();
    final productProvider = context.watch<ProductProvider>();
    final staffProvider = context.watch<StaffProvider>();

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(children: [
                              const Text('Location',
                                  style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold)),
                              Row(
                                children: [
                                  Radio<String>(
                                      value: 'store',
                                      groupValue: cartProvider.location,
                                      onChanged: cartProvider.setLocation),
                                  const Text('Store'),
                                  const SizedBox(width: 16),
                                  Radio<String>(
                                      value: 'warehouse',
                                      groupValue: cartProvider.location,
                                      onChanged: cartProvider.setLocation),
                                  const Text('Warehouse'),
                                ],
                              ),
                              const SizedBox(height: 16),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text('Transaction Employee',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold)),
                              ),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'Staff member who authorized this transaction',
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.grey),
                                ),
                              ),
                              const SizedBox(height: 24),
                              SizedBox(
                                height: 60,
                                child: staffProvider.staffList.isEmpty
                                    ? const Center(
                                        child: CircularProgressIndicator())
                                    : DropdownButtonFormField<String>(
                                        decoration: const InputDecoration(
                                          labelText: 'Select Employee',
                                          border: OutlineInputBorder(),
                                          contentPadding: EdgeInsets.symmetric(
                                              horizontal: 12, vertical: 12),
                                        ),
                                        value: cartProvider.supervisorId,
                                        items: [
                                          const DropdownMenuItem<String>(
                                            value: null,
                                            child:
                                                Text('-- Select Employee --'),
                                          ),
                                          ...staffProvider.staffList.map(
                                            (staff) => DropdownMenuItem<String>(
                                              value: staff.id,
                                              child: Text(staff.name),
                                            ),
                                          ),
                                        ],
                                        onChanged: cartProvider.setSupervisor,
                                        validator: (value) => value == null
                                            ? 'Please select an employee'
                                            : null,
                                        isExpanded: true,
                                      ),
                              )
                            ]),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ProductForm(
                          key: const ValueKey('product_form'),
                          onAddToCart:
                              (productId, size, color, quantity, discount) {
                            cartProvider.addItem(
                              productId: productId,
                              size: size,
                              color: color,
                              quantity: quantity,
                              discount: discount,
                              productProvider: productProvider,
                            );
                          },
                          onUpdateCart:
                              (id, productId, size, color, quantity, discount) {
                            cartProvider.updateItem(
                              id: id,
                              productId: productId,
                              size: size,
                              color: color,
                              quantity: quantity,
                              discount: discount,
                              productProvider: productProvider,
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        CartSummary(
                          onCompleteTransaction: () async {
                            if (!_formKey.currentState!.validate()) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Please fill all required fields.'),
                                    backgroundColor: Colors.red),
                              );
                              return;
                            }

                            if (cartProvider.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Cannot complete transaction with an empty cart.'),
                                    backgroundColor: Colors.red),
                              );
                              return;
                            }

                            final processedItems =
                                cartProvider.applyBulkPricingAcrossVariations(
                                    productProvider);

                            final selectedStaff =
                                staffProvider.staffList.firstWhere(
                              (staff) => staff.id == cartProvider.supervisorId,
                              orElse: () => Staff(id: '', name: 'Unknown'),
                            );

                            final success =
                                await transactionProvider.addTransaction(
                              items: processedItems,
                              location: cartProvider.location,
                              subtotal: cartProvider.calculateSubtotal(),
                              discount: cartProvider.calculateTotalDiscount(),
                              total: cartProvider.calculateTotal(),
                              employee: selectedStaff.name,
                            );

                            if (success) {
                              cartProvider.clearCart();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Transaction completed successfully!'),
                                    backgroundColor: Colors.green),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content:
                                        Text('Failed to complete transaction.'),
                                    backgroundColor: Colors.red),
                              );
                            }
                          },
                        ),
                      ]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
