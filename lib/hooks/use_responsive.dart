import 'package:flutter/material.dart';

enum ScreenSize {
  small,
  medium,
  large,
}

class ResponsiveUtils {
  static ScreenSize getScreenSize(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < 600) {
      return ScreenSize.small;
    } else if (width < 900) {
      return ScreenSize.medium;
    } else {
      return ScreenSize.large;
    }
  }
  
  static bool isSmallScreen(BuildContext context) {
    return getScreenSize(context) == ScreenSize.small;
  }
  
  static bool isMediumScreen(BuildContext context) {
    return getScreenSize(context) == ScreenSize.medium;
  }
  
  static bool isLargeScreen(BuildContext context) {
    return getScreenSize(context) == ScreenSize.large;
  }
  
  static double getResponsiveFontSize(BuildContext context, {
    double small = 12,
    double medium = 14,
    double large = 16,
  }) {
    final screenSize = getScreenSize(context);
    
    switch (screenSize) {
      case ScreenSize.small:
        return small;
      case ScreenSize.medium:
        return medium;
      case ScreenSize.large:
        return large;
    }
  }
  
  static EdgeInsets getResponsivePadding(BuildContext context, {
    EdgeInsets small = const EdgeInsets.all(8),
    EdgeInsets medium = const EdgeInsets.all(16),
    EdgeInsets large = const EdgeInsets.all(24),
  }) {
    final screenSize = getScreenSize(context);
    
    switch (screenSize) {
      case ScreenSize.small:
        return small;
      case ScreenSize.medium:
        return medium;
      case ScreenSize.large:
        return large;
    }
  }
}
