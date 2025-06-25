import 'package:flutter/material.dart';
import 'package:pos_system/models/cart_item.dart';
import 'package:pos_system/data/products.dart';
import 'package:pos_system/models/product.dart';

class CartItemList extends StatelessWidget {
  final List<CartItem> items;
  final Function(String) onEdit;
  final Function(String) onRemove;

  const CartItemList({
    Key? key,
    required this.items,
    required this.onEdit,
    required this.onRemove,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        
        // Calculate total quantity safely
        int totalQuantity = 0;
        for (var i in items.where((i) => i.productId == item.productId)) {
          totalQuantity += i.quantity;
        }
        
        // Find the product safely
        final product = products.firstWhere(
          (p) => p.id == item.productId,
          orElse: () => Product(
            id: '',
            name: '',
            category: '',
            sizes: [],
            colors: [],
            price: 0,
          ),
        );
        
        // Check for bulk pricing safely
        final bool hasBulkPricing = product.bulkPricing != null && 
            totalQuantity >= product.bulkPricing!.minQuantity;
        
        // Calculate the final price (with discount applied)
        final double finalPrice = item.price;
        final double displayPrice = finalPrice * item.quantity - item.discount;
        
        return Card(
          margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 0),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.productName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      'Qty: ${item.quantity}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    item.category,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[700],
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Size: ${item.size}, Color: ${item.color}',
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (item.discount > 0)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '₱${(finalPrice * item.quantity).toStringAsFixed(2)}',
                            style: TextStyle(
                              decoration: TextDecoration.lineThrough,
                              color: Colors.grey[600],
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            '₱${displayPrice.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            'Discount: ₱${item.discount.toStringAsFixed(2)}',
                            style: TextStyle(
                              color: Colors.green[700],
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      )
                    else if (hasBulkPricing && product.bulkPricing != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '₱${(product.price * item.quantity).toStringAsFixed(2)}',
                            style: TextStyle(
                              decoration: TextDecoration.lineThrough,
                              color: Colors.grey[600],
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            '₱${(product.bulkPricing!.discountedPrice * item.quantity).toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            'Bulk Price Applied',
                            style: TextStyle(
                              color: Colors.green[700],
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      )
                    else
                      Text(
                        '₱${(finalPrice * item.quantity).toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, size: 20),
                          onPressed: () => onEdit(item.id),
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.all(8),
                        ),
                        IconButton(
                          icon: Icon(Icons.delete, size: 20, color: Colors.red[700]),
                          onPressed: () => onRemove(item.id),
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.all(8),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
