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
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      sizes: (json['sizes'] as List<dynamic>).map((size) => size as String).toList(),
      colors: (json['colors'] as List<dynamic>).map((color) => color as String).toList(),
      price: json['price'] as double,
      bulkPricing: json['bulkPricing'] != null 
          ? BulkPricing.fromJson(json['bulkPricing'] as Map<String, dynamic>) 
          : null,
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
