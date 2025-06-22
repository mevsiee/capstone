import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/widgets/cart_item_list.dart';

class CartSummary extends StatelessWidget {
  final VoidCallback onCompleteTransaction;

  const CartSummary({
    Key? key,
    required this.onCompleteTransaction,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Consumer2<CartProvider, ProductProvider>(
          builder: (context, cartProvider, productProvider, child) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Order Transaction',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Cart Items
                cartProvider.isEmpty
                    ? _buildEmptyCart()
                    : ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 400),
                        child: CartItemList(
                          items: cartProvider.items,
                          onEdit: (id) {
                            cartProvider.startEditing(id);
                          },
                          onRemove: (id) {
                            cartProvider.removeItem(id);
                          },
                        ),
                      ),
                
                // Order Summary
                if (!cartProvider.isEmpty) ...[
                  const Divider(),
                  const SizedBox(height: 8),
                  
                  // Subtotal
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal:'),
                      Text('₱${cartProvider.calculateSubtotal().toStringAsFixed(2)}'),
                    ],
                  ),
                  const SizedBox(height: 4),
                  
                  // Discount
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Discount:'),
                      Text('₱${cartProvider.calculateTotalDiscount().toStringAsFixed(2)}'),
                    ],
                  ),
                  const SizedBox(height: 4),
                  
                  // Total
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        '₱${cartProvider.calculateTotal().toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Complete Transaction Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: onCompleteTransaction,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        'Complete Transaction',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyCart() {
    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.shopping_cart_outlined,
              size: 64,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 16),
            const Text(
              'No items in cart',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Select products to add to the cart',
              style: TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
