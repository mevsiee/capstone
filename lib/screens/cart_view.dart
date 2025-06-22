import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/models/cart_item.dart';

class CartView extends StatelessWidget {
  const CartView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final items = cartProvider.items;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shopping Cart'),
      ),
      body: items.isEmpty
          ? _buildEmptyCart()
          : _buildCartItems(context, items, cartProvider),
      bottomNavigationBar: items.isEmpty
          ? null
          : _buildCheckoutBar(context, cartProvider),
    );
  }

  Widget _buildEmptyCart() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 100,
            color: Colors.grey,
          ),
          SizedBox(height: 20),
          Text(
            'Your cart is empty',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 10),
          Text(
            'Add items to get started',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItems(
      BuildContext context, List<CartItem> items, CartProvider cartProvider) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (context, index) => const Divider(),
      itemBuilder: (context, index) {
        final item = items[index];
        final priceText = '₱${item.price.toStringAsFixed(2)}';
        
        return ListTile(
          title: Text(item.productName),
          subtitle: Text('Size: ${item.size}, Color: ${item.color}'),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Qty: ${item.quantity}'),
              const SizedBox(width: 8),
              Text(priceText),
              IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () => cartProvider.removeItem(item.id),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCheckoutBar(BuildContext context, CartProvider cartProvider) {
    final subtotal = cartProvider.calculateSubtotal();
    final discount = cartProvider.calculateTotalDiscount();
    final total = subtotal - discount;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.3),
            spreadRadius: 1,
            blurRadius: 5,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Total:',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              Text(
                '₱${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          ElevatedButton(
            onPressed: () {
              // Checkout logic
            },
            child: const Text('Checkout'),
          ),
        ],
      ),
    );
  }
}
