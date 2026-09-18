---
name: flutter-parity
description: Consult the Flutter PowerAuth SDK while developing this React Native SDK so new and changed functionality matches Flutter as closely as possible without sacrificing this codebase's established TypeScript, React Native, Android, and iOS idioms.
---

# Flutter parity

Use
[`wultra/flutter-powerauth-mobile-sdk`](https://github.com/wultra/flutter-powerauth-mobile-sdk)
as the companion implementation while developing functionality in this
repository. Inspect Flutter before designing a change, refer back to it while
implementing each layer, and check it again before finishing.

Match Flutter's feature set and observable behavior as closely as possible.
Translate the design into this repository's established architecture and
language conventions rather than reproducing Dart or Flutter structure
literally.

## Reference selection

Use the Flutter repository's `develop` branch unless the user names a branch,
tag, pull request, or commit. For release work, prefer the matching
`release/a.b.x` branch when it exists. Resolve and record the exact Flutter
commit SHA before comparing files so the result is reproducible.

Read the reference with GitHub tools or `gh`; do not add the Flutter repository
as a dependency or copy it into this repository. Investigate the feature being
developed and directly related models, tests, and documentation rather than
auditing unrelated APIs.

## Repository maps

Trace a Flutter capability through:

1. `lib/flutter_powerauth_mobile_sdk_plugin.dart`, the public export surface;
2. the public Dart API and models under `lib/src/`;
3. the corresponding `*_platform_interface.dart` contract;
4. the `*_method_channel.dart` invocation and serialized arguments;
5. Android services under
   `android/src/main/kotlin/com/wultra/android/powerauth/flutter/`;
6. iOS services under
   `ios/flutter_powerauth_mobile_sdk_plugin/Sources/flutter_powerauth_mobile_sdk_plugin/`;
7. unit tests in `test/`, integration tests in `example/integration_test/`, and
   relevant files in `docs/`.

Map it to this repository's React Native implementation:

1. public exports in `packages/lib-shared/js/index.ts`;
2. TypeScript APIs, models, and helpers in `packages/lib-shared/js/`;
3. native contracts and routing in `packages/lib-shared/js/internal/`;
4. Android implementation in `packages/lib-shared/android/src/main/`;
5. iOS implementation in `packages/lib-shared/ios/PowerAuth/`;
6. focused testbed/E2E scenarios and relevant public documentation.

Ignore generated `build/`, `dist/`, `.build/`, `node_modules/`, and native build
output in both repositories.

## Development workflow

Before writing code:

1. Establish the exact Flutter ref and commit SHA.
2. Find the closest Flutter public API, model, test, or documentation example.
3. Trace its complete Dart-to-Android and Dart-to-iOS implementation.
4. Trace the corresponding local TypeScript-to-Android and TypeScript-to-iOS
   path and identify the existing helpers and conventions to reuse.

During implementation:

* preserve Flutter's capabilities, defaults, optionality, nullability, enum
  values, serialized argument keys, return shapes, and error semantics;
* preserve equivalent asynchronous completion, cancellation, native-object
  ownership, release, and SDK-instance lifetime behavior;
* preserve equivalent security behavior for activation, authentication,
  biometry, passwords, tokens, secure vault, signing, and encryption;
* implement and register native-backed functionality on both Android and iOS;
* reuse this repository's bridge helpers, model builders, authentication
  resolution, native object register, and error mapping;
* use idiomatic TypeScript promises, unions, interfaces, classes, optional
  properties, and naming rather than mirroring Dart syntax or types;
* follow the existing React Native bridge organization rather than introducing
  Flutter platform-interface or method-channel layers; and
* preserve existing public API compatibility unless the requested change is
  explicitly breaking.

Flutter API names and model shapes are guidance, not mandatory spellings. Prefer
the local naming pattern when a literal Flutter translation would be awkward or
inconsistent, while keeping the same user-visible capability and semantics.
Do not restructure unrelated local code merely to resemble Flutter.

Flutter may use platform-specific functionality or newer native PowerAuth SDK
versions. Confirm that this repository's Android and iOS dependencies support
the behavior.

## Consult the human

Stop and consult the user before choosing an alternative when exact parity is
impossible or when matching Flutter would:

* break an existing public React Native API;
* conflict materially with established local idioms;
* require unsupported native SDK functionality;
* create different Android and iOS behavior; or
* alter security-sensitive behavior.

Explain the concrete mismatch, its impact, and the recommended idiomatic option.
Do not silently choose reduced functionality or approximate behavior. Continue
only after the user decides, then document any intentional limitation.

Before finishing:

1. Compare the completed public API and both native implementations with the
   pinned Flutter reference.
2. Add focused local coverage for the same important scenarios represented by
   Flutter tests, expressed through this repository's testbed conventions.
3. Update local public documentation when behavior or API changes.
4. Verify the result using the sibling [verify skill](../verify/SKILL.md).

In the final handoff, mention the Flutter ref used and any intentional,
evidence-based difference that remains. Do not present routine syntax,
architecture, or naming differences as parity gaps.
