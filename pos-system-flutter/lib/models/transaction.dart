import 'package:pos_system/models/cart_item.dart';

class Transaction {
  final String id;
  final String date;
  final String location;
  final List<CartItem> items;
  final double subtotal;
  final double discount;
  final double total;
  final String employee;
  final String timestamp;

  Transaction({
    required this.id,
    required this.date,
    required this.location,
    required this.items,
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.employee,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date,
      'location': location,
      'items': items
          .map((item) => {
                'id': item.id,
                'productId': item.productId,
                'productName': item.productName,
                'category': item.category,
                'size': item.size,
                'color': item.color,
                'quantity': item.quantity,
                'price': item.price,
                'discount': item.discount,
                'isBulkPricing': item.isBulkPricing,
                'originalPrice': item.originalPrice,
              })
          .toList(),
      'subtotal': subtotal,
      'discount': discount,
      'total': total,
      'employee': employee,
      'timestamp': timestamp,
    };
  }

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      date: json['date'] as String,
      location: json['location'] as String,
      items: (json['items'] as List<dynamic>)
          .map((itemJson) => CartItem(
                id: itemJson['id'] as String,
                productId: itemJson['productId'] as String,
                productName: itemJson['productName'] as String,
                category: itemJson['category'] as String,
                size: itemJson['size'] as String,
                color: itemJson['color'] as String,
                quantity: itemJson['quantity'] as int,
                price: itemJson['price'] as double,
                discount: itemJson['discount'] as double,
                isBulkPricing: itemJson['isBulkPricing'] as bool? ?? false,
                originalPrice: itemJson['originalPrice'] as double?,
              ))
          .toList(),
      subtotal: json['subtotal'] as double,
      discount: json['discount'] as double,
      total: json['total'] as double,
      employee: json['employee'] as String,
      timestamp: json['timestamp'] as String,
    );
  }
}
