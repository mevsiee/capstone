class Product {
  final String id;
  final String name;
  final String category;
  final List<String> sizes;
  final List<String> colors;
  final double price;
  final BulkPricing? bulkPricing;

  Product({
    required this.id,
    required this.name,
    required this.category,
    required this.sizes,
    required this.colors,
    required this.price,
    this.bulkPricing,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'sizes': sizes,
      'colors': colors,
      'price': price,
      'bulkPricing': bulkPricing?.toJson(),
    };
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['Product_ID']?.toString() ?? '',
      name: json['Name']?.toString() ?? '',
      category: json['Category']?.toString() ?? '',
      sizes: List<String>.from(json['Size'] ?? []),
      colors: List<String>.from(json['Color'] ?? []),
      price: (json['Price'] ?? 0),
    );
  }
}

class BulkPricing {
  final int minQuantity;
  final double discountedPrice;

  BulkPricing({
    required this.minQuantity,
    required this.discountedPrice,
  });

  Map<String, dynamic> toJson() {
    return {
      'minQuantity': minQuantity,
      'discountedPrice': discountedPrice,
    };
  }

  factory BulkPricing.fromJson(Map<String, dynamic> json) {
    return BulkPricing(
      minQuantity: json['minQuantity'] as int,
      discountedPrice: json['discountedPrice'] as double,
    );
  }
}
