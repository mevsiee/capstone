import 'package:pos_system/models/product.dart';

final List<Product> products = [
  // Tops
  Product(
    id: "P001",
    name: "Basic T-Shirt",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black", "Navy", "Gray"],
    price: 299.0,
    bulkPricing: BulkPricing(
      minQuantity: 3,
      discountedPrice: 249.0,
    ),
  ),
  Product(
    id: "P002",
    name: "Casual Polo Shirt",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black", "Navy", "Red", "Green"],
    price: 499.0,
    bulkPricing: BulkPricing(
      minQuantity: 3,
      discountedPrice: 449.0,
    ),
  ),
  Product(
    id: "P003",
    name: "Formal Shirt",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Black", "Blue", "Pink"],
    price: 699.0,
    bulkPricing: BulkPricing(
      minQuantity: 2,
      discountedPrice: 599.0,
    ),
  ),

  // Bottoms
  Product(
    id: "P004",
    name: "Slim Fit Jeans",
    category: "Bottoms",
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Blue", "Black", "Gray"],
    price: 899.0,
    bulkPricing: BulkPricing(
      minQuantity: 2,
      discountedPrice: 799.0,
    ),
  ),
  Product(
    id: "P005",
    name: "Pleated Skirt",
    category: "Bottoms",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Black", "Navy", "Gray", "Beige"],
    price: 599.0,
    bulkPricing: BulkPricing(
      minQuantity: 3,
      discountedPrice: 499.0,
    ),
  ),
  Product(
    id: "P006",
    name: "Summer Dress",
    category: "Dresses",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Floral", "Blue", "Pink", "Yellow"],
    price: 799.0,
    bulkPricing: BulkPricing(
      minQuantity: 2,
      discountedPrice: 699.0,
    ),
  ),
  Product(
    id: "P007",
    name: "Denim Jacket",
    category: "Outerwear",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "Black", "Light Wash"],
    price: 1299.0,
    bulkPricing: BulkPricing(
      minQuantity: 2,
      discountedPrice: 1099.0,
    ),
  ),
  Product(
    id: "P008",
    name: "Hoodie",
    category: "Outerwear",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Gray", "Navy", "Maroon"],
    price: 899.0,
    bulkPricing: BulkPricing(
      minQuantity: 2,
      discountedPrice: 799.0,
    ),
  ),
];

// Helper function to group products by category
Map<String, List<Product>> getProductsByCategory() {
  final Map<String, List<Product>> categories = {};

  for (var product in products) {
    if (!categories.containsKey(product.category)) {
      categories[product.category] = [];
    }
    categories[product.category]!.add(product);
  }

  return categories;
}
