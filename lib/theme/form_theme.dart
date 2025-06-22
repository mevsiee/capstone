import 'package:flutter/material.dart';

class FormTheme {
  static InputDecoration inputDecorationWithAsterisk(String label) {
    return InputDecoration(
      labelText: '$label *',
      labelStyle: TextStyle(
        color: Colors.black87,
      ),
      border: OutlineInputBorder(),
      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      floatingLabelStyle: TextStyle(
        color: Colors.blue,
      ),
      suffixText: '*',
      suffixStyle: TextStyle(
        color: Colors.red,
        fontWeight: FontWeight.bold,
      ),
    );
  }
  
  static Widget requiredLabel(String label) {
    return Row(
      children: [
        Text(label),
        Text(
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
