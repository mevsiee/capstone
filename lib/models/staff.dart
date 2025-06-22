class Staff {
  final String id;
  final String name;
  final String position;
  final String? image;

  Staff({
    required this.id,
    required this.name,
    required this.position,
    this.image,
  });
}
