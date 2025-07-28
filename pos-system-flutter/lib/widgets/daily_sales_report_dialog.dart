import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pos_system/models/transaction.dart';

class DailySalesReportDialog extends StatelessWidget {
  final List<Transaction> transactions;

  const DailySalesReportDialog({
    Key? key,
    required this.transactions,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final reportData = _generateDailyReportData();

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width > 450
            ? 400
            : MediaQuery.of(context).size.width * 0.9,
        padding: const EdgeInsets.all(0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 16, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Daily Sales Report',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        reportData['date']!,
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints:
                        const BoxConstraints(minWidth: 40, minHeight: 40),
                  ),
                ],
              ),
            ),

            // Sales Summary
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  _buildSummaryBox(
                    'Total Sales',
                    '₱${reportData['totalSales']}',
                    reportData['totalTransactions']!,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBox(String title, String amount, String transactions) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Title + transaction count
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                transactions,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          // Right: Amount
          Text(
            amount,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Map<String, String> _generateDailyReportData() {
    final now = DateTime.now();
    final dateFormatter = DateFormat('MMMM d, yyyy');
    double totalSales = 0.0;

    for (final tx in transactions) {
      totalSales += tx.total;
    }

    final numberFormatter = NumberFormat("#,##0.00", "en_US");

    return {
      'date': dateFormatter.format(now),
      'totalSales': numberFormatter.format(totalSales),
      'totalTransactions': '${transactions.length} transactions',
    };
  }
}
