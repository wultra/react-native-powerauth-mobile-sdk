// swift-tools-version: 5.9

import PackageDescription

// Used by cordova-ios 8 or later, which the plugin requires.
let package = Package(
    name: "cordova-powerauth-mobile-sdk",
    platforms: [
        .iOS("15.0"),
    ],
    products: [
        // cordova-ios links the product named after the plugin id.
        .library(
            name: "cordova-powerauth-mobile-sdk",
            targets: ["PowerAuthCordova"]
        ),
    ],
    dependencies: [
        // cordova-ios rewrites this line to its local Cordova package.
        .package(url: "https://github.com/apache/cordova-ios.git", from: "8.0.0"),
        // Mirrors the CocoaPods `PowerAuth2` dependency (`~> 2.1.0`).
        .package(
            url: "https://github.com/wultra/powerauth-mobile-sdk",
            .upToNextMinor(from: "2.1.0")
        ),
    ],
    targets: [
        .target(
            name: "PowerAuthCordova",
            dependencies: [
                .product(name: "Cordova", package: "cordova-ios"),
                .product(name: "PowerAuth2", package: "powerauth-mobile-sdk"),
            ],
            path: "ios/PowerAuth"
        ),
    ]
)
