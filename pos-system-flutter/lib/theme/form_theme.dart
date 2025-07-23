import 'package:flutter/material.dart';

class FormTheme {
  static InputDecoration inputDecorationWithAsterisk(String label) {
    return InputDecoration(
      labelText: '$label *',
      labelStyle: const TextStyle(
        color: Colors.black87,
      ),
      border: const OutlineInputBorder(),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      floatingLabelStyle: const TextStyle(
        color: Colors.blue,
      ),
      suffixText: '*',
      suffixStyle: const TextStyle(
        color: Colors.red,
        fontWeight: FontWeight.bold,
      ),
    );
  }
  
  static Widget requiredLabel(String label) {
    return Row(
      children: [
        Text(label),
        const Text(
          ' *',
          style: TextStyle(
            color: Colors.red,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
