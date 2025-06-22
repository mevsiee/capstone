import 'package:flutter/material.dart';
import 'package:pos_system/models/transaction.dart';
import 'package:pos_system/widgets/transaction_details.dart';

class TransactionList extends StatelessWidget {
  final List<Transaction> transactions;
  final String? expandedTransactionId;
  final Function(String) onToggleExpand;

  const TransactionList({
    Key? key,
    required this.transactions,
    required this.expandedTransactionId,
    required this.onToggleExpand,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      itemCount: transactions.length,
      itemBuilder: (context, index) {
        final transaction = transactions[index];
        final isExpanded = expandedTransactionId == transaction.id;
        
        return Container(
          margin: const EdgeInsets.only(bottom: 8.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Transaction header
              InkWell(
                onTap: () => onToggleExpand(transaction.id),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      // Location and ID
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                transaction.location,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              transaction.id,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Amount and expand icon
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₱${transaction.total.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${transaction.items.length} ${transaction.items.length == 1 ? 'item' : 'items'}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        color: Colors.grey,
                      ),
                    ],
                  ),
                ),
              ),
              
              // Date row
              Padding(
                padding: const EdgeInsets.only(left: 12.0, right: 12.0, bottom: 12.0),
                child: Row(
                  children: [
                    Text(
                      'Date: ${transaction.date}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Transaction details (expanded view)
              if (isExpanded)
                TransactionDetails(transaction: transaction),
            ],
          ),
        );
      },
    );
  }
}
