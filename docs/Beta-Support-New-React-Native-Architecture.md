# Beta Support for the New React Native Architecture

> [!WARNING]
> Beta builds are tested and working, but should not be used for production release yet.

> [!NOTE]
> You don’t need to change anything regarding the preferred app architecture (Native Modules, Bridgeless Mode, New Architecture, etc.).
> There are no API changes to the SDK.

> [!NOTE]
> Beta builds implement [Bridgeless Mode](https://github.com/reactwg/react-native-new-architecture/discussions/154), supporting both the legacy React Native bridge and the new [TurboModules](https://github.com/reactwg/react-native-new-architecture/blob/main/docs/turbo-modules.md).

## How to Install the Beta Build

1. Remove the current `react-native-powerauth-mobile-sdk` dependency.
  - _eg `npm r react-native-powerauth-mobile-sdk`_
2. Install the beta build by directly referencing the tarball link. The tarball link can be found in the **Assets** section of the [beta release](https://github.com/wultra/react-native-powerauth-mobile-sdk/releases). 
  - _eg `npm i https://github.com/wultra/react-native-powerauth-mobile-sdk/releases/download/.....tgz`_
3. Run your app as usual — there are no API changes.

## When Will the Beta Phase End?

Bridgeless Mode has been tested internally and is now in public testing. Once we confirm that no issues have been reported and the builds are stable, we will release it as a regular npm package.

## What About Native TurboModules Support?

Direct TurboModules support is actively being developed, and we plan to release it in Q3.

## Changelog

### Beta 1 (Apr 9, 2025)
- Initial Bridgeless Mode support.
