import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/staff_provider.dart';

class EmployeeDropdown extends StatelessWidget {
  final String? value;
  final Function(String?) onChanged;
  final String? Function(String?)? validator;

  const EmployeeDropdown({
    Key? key,
    required this.value,
    required this.onChanged,
    this.validator,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final staffProvider = Provider.of<StaffProvider>(context);
    final staffList = staffProvider.staffList;

    return DropdownButtonFormField<String>(
      decoration: const InputDecoration(
        labelText: 'Select Employee',
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        suffixText: '*',
        suffixStyle: TextStyle(
          color: Colors.red,
          fontWeight: FontWeight.bold,
        ),
      ),
      value: value,
      items: [
        const DropdownMenuItem<String>(
          value: null,
          child: Text('-- Select Employee --'),
        ),
        ...staffList.map((staff) => DropdownMenuItem<String>(
              value: staff.id,
              child: Text(staff.name),
            )),
      ],
      isExpanded: true,
      icon: const Icon(Icons.arrow_drop_down),
      iconSize: 24,
      menuMaxHeight: 300,
      onChanged: onChanged,
      validator: validator,
    );
  }
}
