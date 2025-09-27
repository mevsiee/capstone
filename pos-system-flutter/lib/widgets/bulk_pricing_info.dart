import 'package:flutter/material.dart';
import 'package:pos_system/data/products.dart';

class BulkPricingInfo extends StatelessWidget {
  final String productId;

  const BulkPricingInfo({
    Key? key,
    required this.productId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final product = products.firstWhere((p) => p.id == productId);

    if (product.bulkPricing == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 4.0),
      child: InkWell(
        onTap: () {
          _showBulkPricingTooltip(context, product);
        },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.info_outline,
              size: 14,
              color: Colors.grey,
            ),
            const SizedBox(width: 4),
            Text(
              'Bulk pricing available',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showBulkPricingTooltip(BuildContext context, product) {
    final bulkPricing = product.bulkPricing!;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bulk Pricing'),
        content: Text(
          'Buy ${bulkPricing.minQuantity}+ items: ₱${bulkPricing.discountedPrice.toStringAsFixed(2)} each',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
