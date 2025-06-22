import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pos_system/providers/auth_provider.dart';
import 'package:pos_system/widgets/app_header.dart';
import 'package:pos_system/screens/pos_screen.dart';
import 'package:pos_system/screens/transaction_history_screen.dart';
import 'package:pos_system/screens/product_management_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_handleTabChange);
  }

  void _handleTabChange() {
    if (_tabController.indexIsChanging || _tabController.index != _currentIndex) {
      setState(() {
        _currentIndex = _tabController.index;
      });
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      appBar: AppHeader(
        user: authProvider.user,
        onLogout: () => authProvider.logout(),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: Theme.of(context).colorScheme.surface,
              child: TabBar(
                controller: _tabController,
                labelColor: Theme.of(context).primaryColor,
                unselectedLabelColor: Colors.grey,
                indicatorColor: Theme.of(context).primaryColor,
                indicatorWeight: 3,
                tabs: const [
                  Tab(
                    icon: Icon(Icons.shopping_cart),
                    text: 'New Order',
                  ),
                  Tab(
                    icon: Icon(Icons.history),
                    text: 'History',
                  ),
                  Tab(
                    icon: Icon(Icons.inventory_2),
                    text: 'Products',
                  ),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  const PosScreen(key: PageStorageKey('pos_screen')),
                  const TransactionHistoryScreen(key: PageStorageKey('transaction_history')),
                  const ProductManagementScreen(key: PageStorageKey('product_management')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
