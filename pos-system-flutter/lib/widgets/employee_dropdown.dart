import 'package:flutter/material.dart';
import 'package:pos_system/data/staff.dart';

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
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(
        labelText: 'Select Employee',
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        suffixText: '*',
        suffixStyle: TextStyle(
          color: Colors.red,
          fontWeight: FontWeight.bold,
        ),
        isDense: false,
      ),
      value: value,
      items: [
        const DropdownMenuItem<String>(
          value: null,
          child: Text('-- Select Employee --'),
        ),
        ...staffMembers.map((staff) => DropdownMenuItem<String>(
          value: staff.id,
          child: Container(
            height: 50,
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (staff.image != null)
                  Container(
                    width: 32,
                    height: 32,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      image: DecorationImage(
                        image: NetworkImage(staff.image!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        staff.name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        staff.position,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        )),
      ],
      isExpanded: true,
      icon: Icon(Icons.arrow_drop_down),
      iconSize: 24,
      menuMaxHeight: 300,
      onChanged: onChanged,
      validator: validator,
    );
  }
}
