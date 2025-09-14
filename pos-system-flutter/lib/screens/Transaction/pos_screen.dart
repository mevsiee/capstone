import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/transaction_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/providers/staff_provider.dart';
import 'package:pos_system/providers/pos_session_provider.dart';
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
    final posSessionProvider = context.watch<PosSessionProvider>();

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      elevation: 2,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'POS Session',
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: BoxDecoration(
                                              color: posSessionProvider
                                                      .isSessionActive
                                                  ? Colors.green
                                                  : Colors.red,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            posSessionProvider.isSessionActive
                                                ? 'Active'
                                                : 'Inactive',
                                            style: TextStyle(
                                              color: posSessionProvider
                                                      .isSessionActive
                                                  ? Colors.green
                                                  : Colors.red,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          if (posSessionProvider
                                                  .isSessionActive &&
                                              posSessionProvider
                                                  .sessionDuration.isNotEmpty)
                                            Text(
                                              ' • ${posSessionProvider.sessionDuration}',
                                              style: const TextStyle(
                                                color: Colors.grey,
                                                fontSize: 12,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Flexible(
                                  child: ElevatedButton(
                                    onPressed: posSessionProvider.isLoading
                                        ? null
                                        : () => _handleSessionToggle(
                                            context,
                                            posSessionProvider,
                                            transactionProvider),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor:
                                          posSessionProvider.isSessionActive
                                              ? Colors.red
                                              : Colors.green,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 20, vertical: 12),
                                    ),
                                    child: posSessionProvider.isLoading
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor:
                                                  AlwaysStoppedAnimation<Color>(
                                                      Colors.white),
                                            ),
                                          )
                                        : Text(
                                            posSessionProvider.isSessionActive
                                                ? 'End POS'
                                                : 'Start POS',
                                          ),
                                  ),
                                ),
                              ],
                            ),
                            if (!posSessionProvider.isSessionActive)
                              const Padding(
                                padding: EdgeInsets.only(top: 8.0),
                                child: Text(
                                  'Start POS session to begin creating transactions',
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    AbsorbPointer(
                      absorbing: !posSessionProvider.isSessionActive,
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Card(
                              color: posSessionProvider.isSessionActive
                                  ? null
                                  : Colors.grey.shade50,
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
                                              contentPadding:
                                                  EdgeInsets.symmetric(
                                                      horizontal: 12,
                                                      vertical: 12),
                                            ),
                                            value: cartProvider.supervisorId,
                                            items: [
                                              const DropdownMenuItem<String>(
                                                value: null,
                                                child: Text(
                                                    '-- Select Employee --'),
                                              ),
                                              ...staffProvider.staffList.map(
                                                (staff) =>
                                                    DropdownMenuItem<String>(
                                                  value: staff.id,
                                                  child: Text(staff.name),
                                                ),
                                              ),
                                            ],
                                            onChanged:
                                                cartProvider.setSupervisor,
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
                              onUpdateCart: (id, productId, size, color,
                                  quantity, discount) {
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
                                if (!posSessionProvider.isSessionActive) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content: Text(
                                            'Please start POS session first.'),
                                        backgroundColor: Colors.red),
                                  );
                                  return;
                                }

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

                                final processedItems = cartProvider
                                    .applyBulkPricingAcrossVariations(
                                        productProvider);

                                final selectedStaff =
                                    staffProvider.staffList.firstWhere(
                                  (staff) =>
                                      staff.id == cartProvider.supervisorId,
                                );

                                final success =
                                    await transactionProvider.addTransaction(
                                  items: processedItems,
                                  location: cartProvider.location,
                                  subtotal: cartProvider.calculateSubtotal(),
                                  discount:
                                      cartProvider.calculateTotalDiscount(),
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
                                        content: Text(
                                            'Failed to complete transaction.'),
                                        backgroundColor: Colors.red),
                                  );
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _handleSessionToggle(
    BuildContext context,
    PosSessionProvider posSessionProvider,
    TransactionProvider transactionProvider,
  ) async {
    if (posSessionProvider.isSessionActive) {
      // End POS - Show confirmation dialog
      final shouldEnd = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('End POS Session'),
          content: const Text(
            'Ending the POS session will sync all transaction history to the server and clear local data. Do you want to continue?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text(
                'End Session',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        ),
      );

      if (shouldEnd == true) {
        try {
          // Sync transactions first
          if (transactionProvider.transactions.isNotEmpty) {
            await transactionProvider.pushCachedTransactionsManually();
            // Clear transactions after successful sync
            await transactionProvider.clearTransactions();
          }

          // End the session
          await posSessionProvider.endSession();

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content:
                    Text('POS session ended and data synced successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error ending session: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } else {
      // Start POS
      try {
        await posSessionProvider.startSession();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('POS session started successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error starting session: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }
}

class Staff {
  final String id;
  final String name;

  Staff({required this.id, required this.name});
}
