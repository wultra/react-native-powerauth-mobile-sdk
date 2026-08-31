// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "ReactNativePowerauthMobileSdk",
    platforms: [
        .iOS("15.1"),
    ],
    products: [
        .library(
            name: "ReactNativePowerauthMobileSdk",
            targets: ["ReactNativePowerauthMobileSdk"]
        ),
    ],
    dependencies: [
        // React Native resolves this path through its generated
        // build/generated/autolinking/libs/<SwiftName> package alias.
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        // Mirrors the CocoaPods `PowerAuth2` dependency (`~> 2.0.0`).
        .package(
            url: "https://github.com/wultra/powerauth-mobile-sdk",
            .upToNextMinor(from: "2.0.0")
        ),
    ],
    targets: [
        .target(
            name: "ReactNativePowerauthMobileSdk",
            dependencies: [
                .product(name: "ReactHeaders", package: "ReactNative"),
                .product(name: "ReactNativeHeaders", package: "ReactNative"),
                .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
                .product(name: "PowerAuth2", package: "powerauth-mobile-sdk"),
            ],
            path: "ios/PowerAuth",
            publicHeadersPath: ".",
            linkerSettings: [
                .linkedFramework("Foundation"),
                .linkedFramework("UIKit"),
            ]
        ),
    ]
)
