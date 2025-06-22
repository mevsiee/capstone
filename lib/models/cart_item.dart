class CartItem {
  final String id;
  final String productId;
  final String productName;
  final String category;
  final String size;
  final String color;
  final int quantity;
  final double price;
  final double discount;
  final bool isBulkPricing;
  final double? originalPrice;

  CartItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.category,
    required this.size,
    required this.color,
    required this.quantity,
    required this.price,
    required this.discount,
    this.isBulkPricing = false,
    this.originalPrice,
  });

  double get total {
    return (price * quantity) - discount;
  }

  CartItem copyWith({
    String? id,
    String? productId,
    String? productName,
    String? category,
    String? size,
    String? color,
    int? quantity,
    double? price,
    double? discount,
    bool? isBulkPricing,
    double? originalPrice,
  }) {
    return CartItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      category: category ?? this.category,
      size: size ?? this.size,
      color: color ?? this.color,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      discount: discount ?? this.discount,
      isBulkPricing: isBulkPricing ?? this.isBulkPricing,
      originalPrice: originalPrice ?? this.originalPrice,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'productName': productName,
      'category': category,
      'size': size,
      'color': color,
      'quantity': quantity,
      'price': price,
      'discount': discount,
      'isBulkPricing': isBulkPricing,
      'originalPrice': originalPrice,
    };
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      category: json['category'] as String,
      size: json['size'] as String,
      color: json['color'] as String,
      quantity: json['quantity'] as int,
      price: json['price'] as double,
      discount: json['discount'] as double,
      isBulkPricing: json['isBulkPricing'] as bool? ?? false,
      originalPrice: json['originalPrice'] as double?,
    );
  }
}
