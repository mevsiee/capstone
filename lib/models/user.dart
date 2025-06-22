class User {
  final String name;
  final String email;
  final String? image;

  User({
    required this.name,
    required this.email,
    this.image,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'image': image,
    };
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      name: json['name'] as String,
      email: json['email'] as String,
      image: json['image'] as String?,
    );
  }
}
