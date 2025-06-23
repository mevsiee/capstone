# POS System - Flutter

A Flutter-based Point-of-Sale (POS) system designed for EShop Clothing. This project includes user authentication, product management, and cart and transaction handling.

**Project Structure**

```
lib/
├── main.dart                         # Entry point
├── theme/                            # Theme styling
│   ├── app_theme.dart
│   └── form_theme.dart
├── screens/                          # UI screens
│   ├── login_screen.dart
│   ├── home_screen.dart
│   ├── pos_screen.dart
│   ├── cart_view.dart
│   ├── transaction_history_screen.dart
│   ├── product_management_screen.dart
│   ├── add_product_screen.dart
│   ├── edit_product_screen.dart
│   └── account_settings_screen.dart
├── models/                           # Data models
│   ├── user.dart
│   ├── staff.dart
│   ├── product.dart
│   ├── transaction.dart
│   └── cart_item.dart
└── providers/                        # State management
    ├── auth_provider.dart
    └── transaction_provider.dart
```

**Features**
- User Authentication
- Cart and Checkout System
- Product Management (Add/Edit/Delete)
- Transaction History
- Account Settings

**Prerequisites**
- Flutter SDK
- Dart
- Android Studio / Xcode / VS Code

**Installation**
```bash
git clone https://github.com/yourusername/pos-system-flutter.git
cd pos-system-flutter
flutter pub get
flutter run
```

**To Do**
- Firebase integration
- Shopee & TikTok Shop sync
- Cloud Firestore support
- Dashboard analytics (Looker Studio)

**License**

This project is proprietary and intended solely for academic use as part of a capstone project at the University of Santo Tomas (UST). Unauthorized reproduction, distribution, or commercial use of this code is strictly prohibited.

