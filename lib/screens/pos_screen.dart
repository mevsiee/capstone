import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/auth_provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/transaction_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/widgets/product_form.dart';
import 'package:pos_system/widgets/cart_summary.dart';
import 'package:pos_system/data/staff.dart';
import 'package:pos_system/widgets/daily_sales_report_dialog.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({Key? key}) : super(key: key);

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> with AutomaticKeepAliveClientMixin {
  final _formKey = GlobalKey<FormState>();
  
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    
    final cartProvider = Provider.of<CartProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final transactionProvider = Provider.of<TransactionProvider>(context);
    final productProvider = Provider.of<ProductProvider>(context);
    
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      
                      // Location and Supervisor Section
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Location selection
                              const Text(
                                'Location',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Radio<String>(
                                    value: 'store',
                                    groupValue: cartProvider.location,
                                    onChanged: (value) {
                                      if (value != null) {
                                        cartProvider.setLocation(value);
                                      }
                                    },
                                  ),
                                  const Text('Store'),
                                  const SizedBox(width: 16),
                                  Radio<String>(
                                    value: 'warehouse',
                                    groupValue: cartProvider.location,
                                    onChanged: (value) {
                                      if (value != null) {
                                        cartProvider.setLocation(value);
                                      }
                                    },
                                  ),
                                  const Text('Warehouse'),
                                ],
                              ),
                              const SizedBox(height: 16),
                              
                              // Supervisor selection with red asterisk
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Title and asterisk
                                  Row(
                                    children: [
                                      const Text(
                                        'Transaction Supervisor',
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        ' *',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Description with no gap
                                  const Text(
                                    'Staff member who authorized this transaction',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                              
                              // Add significant padding between description and dropdown
                              const SizedBox(height: 24),
                              
                              // Dropdown field
                              SizedBox(
                                height: 60, // Fixed height to prevent overflow
                                child: DropdownButtonFormField<String>(
                                  decoration: InputDecoration(
                                    labelText: 'Select Employee',
                                    border: OutlineInputBorder(),
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                  ),
                                  value: cartProvider.supervisorId,
                                  items: [
                                    const DropdownMenuItem<String>(
                                      value: null,
                                      child: Text('-- Select Employee --'),
                                    ),
                                    ...staffMembers.map((staff) => DropdownMenuItem<String>(
                                      value: staff.id,
                                      child: Text(staff.name),
                                    )),
                                  ],
                                  onChanged: (value) {
                                    cartProvider.setSupervisor(value);
                                  },
                                  validator: (value) {
                                    if (value == null) {
                                      return 'Please select an employee';
                                    }
                                    return null;
                                  },
                                  isExpanded: true,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      // Product Form
                      ProductForm(
                        key: const ValueKey('product_form'),
                        onAddToCart: (productId, size, color, quantity, discount) {
                          cartProvider.addItem(
                            productId: productId,
                            size: size,
                            color: color,
                            quantity: quantity,
                            discount: discount,
                            productProvider: productProvider,
                          );
                        },
                        onUpdateCart: (id, productId, size, color, quantity, discount) {
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
                      
                      // Cart Summary - Bottom Section
                      CartSummary(
                        onCompleteTransaction: () {
                          if (!_formKey.currentState!.validate()) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please fill all required fields.'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }
                          
                          if (cartProvider.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Cannot complete transaction with an empty cart.'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }
                          
                          // Process cart items to apply bulk pricing across variations
                          final processedItems = cartProvider.applyBulkPricingAcrossVariations(productProvider);
                          
                          // Create a new transaction
                          transactionProvider.addTransaction(
                            items: processedItems,
                            location: cartProvider.location,
                            subtotal: cartProvider.calculateSubtotal(),
                            discount: cartProvider.calculateTotalDiscount(),
                            total: cartProvider.calculateTotal(),
                            employee: authProvider.user?.name ?? 'Unknown',
                            supervisorId: cartProvider.supervisorId,
                          );
                          
                          // Clear the cart
                          cartProvider.clearCart();
                          
                          // Show success message
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Transaction completed successfully!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
