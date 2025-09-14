import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/transaction_provider.dart';
import 'package:pos_system/widgets/transaction_list.dart';
import 'package:pos_system/widgets/daily_sales_report_dialog.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({Key? key}) : super(key: key);

  @override
  State<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final transactionProvider = Provider.of<TransactionProvider>(context);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        child: Column(
          children: [
            // Status message display
            if (transactionProvider.statusMessage.isNotEmpty)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 16.0, bottom: 8.0),
                padding: const EdgeInsets.all(12.0),
                decoration: BoxDecoration(
                  color: transactionProvider.statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: transactionProvider.statusColor.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    if (transactionProvider.isLoading)
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            transactionProvider.statusColor,
                          ),
                        ),
                      )
                    else
                      Icon(
                        _getStatusIcon(transactionProvider.statusColor),
                        size: 16,
                        color: transactionProvider.statusColor,
                      ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        transactionProvider.statusMessage,
                        style: TextStyle(
                          color: transactionProvider.statusColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => transactionProvider.clearStatus(),
                      child: Icon(
                        Icons.close,
                        size: 16,
                        color: transactionProvider.statusColor,
                      ),
                    ),
                  ],
                ),
              ),

            // View Sales Report button at the top
            Padding(
              padding: const EdgeInsets.only(top: 16.0, bottom: 8.0),
              child: Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => DailySalesReportDialog(
                        transactions: transactionProvider.transactions,
                      ),
                    );
                  },
                  icon: const Icon(Icons.bar_chart, size: 16),
                  label: const Text('View Sales Report'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),

            // Transaction history container
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header with Transaction History title, Sync button, and Clear All
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.receipt_long, size: 24),
                              SizedBox(width: 8),
                              Text(
                                'Transaction History',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          // Sync and Clear All buttons (if transactions exist)
                          if (transactionProvider.transactions.isNotEmpty)
                            Row(
                              children: [
                                // Sync button
                                GestureDetector(
                                  onTap: transactionProvider.isLoading
                                      ? null
                                      : () => transactionProvider
                                          .pushCachedTransactionsManually(),
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: transactionProvider.isLoading
                                          ? Colors.grey.shade100
                                          : Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: transactionProvider.isLoading
                                            ? Colors.grey.shade300
                                            : Colors.blue.shade200,
                                      ),
                                    ),
                                    child: transactionProvider.isLoading
                                        ? SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor:
                                                  AlwaysStoppedAnimation<Color>(
                                                Colors.grey.shade600,
                                              ),
                                            ),
                                          )
                                        : Icon(
                                            Icons.sync,
                                            size: 16,
                                            color: Colors.blue.shade600,
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Clear All text
                                GestureDetector(
                                  onTap: transactionProvider.isLoading
                                      ? null
                                      : () => _showClearConfirmationDialog(
                                          context, transactionProvider),
                                  child: Text(
                                    'Clear All',
                                    style: TextStyle(
                                      color: transactionProvider.isLoading
                                          ? Colors.grey
                                          : Colors.red,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),

                    // Transaction list
                    Expanded(
                      child: transactionProvider.transactions.isEmpty
                          ? const Center(
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.receipt_long,
                                    size: 64,
                                    color: Colors.black12,
                                  ),
                                  SizedBox(height: 16),
                                  Text(
                                    'No transaction history',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Complete a transaction to see it here',
                                    style: TextStyle(
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : TransactionList(
                              transactions: transactionProvider.transactions,
                              expandedTransactionId:
                                  transactionProvider.expandedTransactionId,
                              onToggleExpand: (id) => transactionProvider
                                  .toggleExpandTransaction(id),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getStatusIcon(Color color) {
    if (color == Colors.green) return Icons.check_circle;
    if (color == Colors.red) return Icons.error;
    if (color == Colors.orange) return Icons.warning;
    return Icons.info;
  }

  void _showClearConfirmationDialog(
      BuildContext context, TransactionProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Transaction History'),
        content: const Text(
          'Are you sure you want to clear all transaction history? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await provider.clearTransactions();
            },
            child: const Text(
              'Clear',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
