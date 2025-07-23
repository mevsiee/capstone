import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'package:pos_system/theme/app_theme.dart';

import 'package:pos_system/providers/auth_provider.dart';
import 'package:pos_system/providers/cart_provider.dart';
import 'package:pos_system/providers/transaction_provider.dart';
import 'package:pos_system/providers/product_provider.dart';
import 'package:pos_system/providers/staff_provider.dart';

import 'package:pos_system/screens/Authentication/login_screen.dart';
import 'package:pos_system/screens/Main Screen/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Initialize SQLite database for ProductProvider
  final productProvider = ProductProvider();
  await productProvider.initDatabase();

  runApp(MyApp(productProvider: productProvider));
}

class MyApp extends StatelessWidget {
  final ProductProvider productProvider;

  const MyApp({Key? key, required this.productProvider}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => TransactionProvider()),
        ChangeNotifierProvider<ProductProvider>.value(value: productProvider),
        ChangeNotifierProvider(create: (_) => StaffProvider()),
      ],
      child: MaterialApp(
        title: 'Retail Ordering System for EShop Clothing',
        theme: AppTheme.lightTheme,
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, _) {
            return authProvider.isLoggedIn
                ? const HomeScreen()
                : const LoginScreen();
          },
        ),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
