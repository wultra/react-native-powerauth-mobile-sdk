# Sample Integration

To better understand the APIs of the PowerAuth Mobile JS SDK, we prepared a sample test application.

## Test Application

The test application with the PowerAuth Mobile JS SDK integration can be found inside the `testapp` folder of the [GitHub repository](https://github.com/wultra/react-native-powerauth-mobile-sdk#docucheck-keep-link). Visit [_tests](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/testapp/_tests#docucheck-keep-link) folder for example usage of the SDK. The [PowerAuth_Example.ts](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/testapp/_tests/PowerAuth_Example.ts#docucheck-keep-link) file is perhaps the best start point, because contains a well commented example of the activation flow.

<!-- begin box warning -->
The test application is using our [`powerauth-js-test-client`](https://github.com/wultra/powerauth-js-test-client) library to manage activations on the server automatically. You suppose to don't do such thing in the real application.
<!-- end -->