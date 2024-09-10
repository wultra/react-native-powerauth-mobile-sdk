/*
 * Copyright 2020 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.wultra.android.powerauth.reactnative;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.util.Base64;
import android.util.Pair;

import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.annotation.Nonnull;

import io.getlime.security.powerauth.biometry.BiometricKeyData;
import io.getlime.security.powerauth.biometry.BiometricAuthentication;
import io.getlime.security.powerauth.biometry.BiometricStatus;
import io.getlime.security.powerauth.biometry.BiometryType;
import io.getlime.security.powerauth.biometry.IAddBiometryFactorListener;
import io.getlime.security.powerauth.biometry.IBiometricAuthenticationCallback;
import io.getlime.security.powerauth.biometry.ICommitActivationWithBiometryListener;
import io.getlime.security.powerauth.keychain.KeychainProtection;
import io.getlime.security.powerauth.networking.interceptors.BasicHttpAuthenticationRequestInterceptor;
import io.getlime.security.powerauth.sdk.*;
import io.getlime.security.powerauth.networking.ssl.HttpClientSslNoValidationStrategy;
import io.getlime.security.powerauth.networking.interceptors.CustomHeaderRequestInterceptor;
import io.getlime.security.powerauth.networking.response.*;
import io.getlime.security.powerauth.core.*;
import io.getlime.security.powerauth.exception.*;
import io.getlime.security.powerauth.sdk.impl.MainThreadExecutor;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuth")
public class PowerAuthModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext context;
    private final ObjectRegister objectRegister;
    private final PowerAuthPasswordModule passwordModule;

    public PowerAuthModule(ReactApplicationContext context, @NonNull ObjectRegister objectRegister, @NonNull PowerAuthPasswordModule passwordModule) {
        super(context);
        this.context = context;
        this.objectRegister = objectRegister;
        this.passwordModule = passwordModule;
    }

    // React integration

    @NonNull
    @Override
    public String getName() {
        return "PowerAuth";
    }

    @ReactMethod
    public void isConfigured(@Nonnull String instanceId, final Promise promise) {
        try {
            promise.resolve(getPowerAuthInstance(instanceId) != null);
        } catch (PowerAuthErrorException e) {
            Errors.rejectPromise(promise, e);
        }
    }

    @ReactMethod
    public void configure(final String instanceId, final ReadableMap configuration, final ReadableMap clientConfiguration, final ReadableMap biometryConfiguration, final ReadableMap keychainConfiguration, final ReadableMap sharingConfiguration, Promise promise) {
        try {
            boolean result = registerPowerAuthInstance(instanceId, () -> {
                // Create configurations from maps
                final PowerAuthConfiguration paConfig = getPowerAuthConfigurationFromMap(instanceId, configuration);
                if (paConfig == null) {
                    throw new PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Provided configuration is invalid");
                }
                final PowerAuthClientConfiguration paClientConfig = getPowerAuthClientConfigurationFromMap(clientConfiguration);
                final PowerAuthKeychainConfiguration paKeychainConfig = getPowerAuthKeychainConfigurationFromMap(keychainConfiguration, biometryConfiguration);
                // Configure the instance
                final PowerAuthSDK instance = new PowerAuthSDK.Builder(paConfig)
                        .clientConfiguration(paClientConfig)
                        .keychainConfiguration(paKeychainConfig)
                        .build(PowerAuthModule.this.context);
                return ManagedAny.wrap(instance);

            });
            if (result) {
                promise.resolve(true);
            } else {
                promise.reject(Errors.EC_REACT_NATIVE_ERROR, "PowerAuth object with this instanceId is already configured.");
            }
        } catch (Throwable e) {
            Errors.rejectPromise(promise, e);
        }
    }

    @ReactMethod
    public void deconfigure(String instanceId, final Promise promise) {
        try {
            unregisterPowerAuthInstance(instanceId);
            promise.resolve(null);
        } catch (PowerAuthErrorException e) {
            Errors.rejectPromise(promise, e);
        }
    }

    /**
     * Create KeychainProtection value from given string.
     * @param stringValue String representation of keychain protection.
     * @return KeychainProtection converted from string value.
     */
    private static @KeychainProtection int getKeychainProtectionFromString(@Nullable String stringValue) {
        if (stringValue != null) {
            if ("NONE".equals(stringValue)) {
                return KeychainProtection.NONE;
            } else if ("SOFTWARE".equals(stringValue)) {
                return KeychainProtection.SOFTWARE;
            } else if ("HARDWARE".equals(stringValue)) {
                return KeychainProtection.HARDWARE;
            } else if ("STRONGBOX".equals(stringValue)) {
                return KeychainProtection.STRONGBOX;
            }
        }
        return KeychainProtection.NONE;
    }

    /**
     * Convert ReadableMap to {@link PowerAuthConfiguration} object.
     * @param instanceId PowerAuth instance identifier.
     * @param map Map with configuration.
     * @return {@link PowerAuthConfiguration} created from given map.
     */
    private static @Nullable PowerAuthConfiguration getPowerAuthConfigurationFromMap(final String instanceId, final ReadableMap map) {
        // Configuration parameters
        final String baseEndpointUrl = map.getString("baseEndpointUrl");
        final String appKey = map.getString("applicationKey");
        final String appSecret = map.getString("applicationSecret");
        final String masterServerPublicKey = map.getString("masterServerPublicKey");
        if (baseEndpointUrl == null || appKey == null || appSecret == null || masterServerPublicKey == null) {
            return null;
        }
        return new PowerAuthConfiguration.Builder(
                instanceId,
                baseEndpointUrl,
                appKey,
                appSecret,
                masterServerPublicKey
        ).build();
    }

    /**
     * Convert ReadableMap to {@link PowerAuthClientConfiguration} object.
     * @param map Map with client configuration.
     * @return {@link PowerAuthClientConfiguration} created from given map.
     */
    private static @NonNull PowerAuthClientConfiguration getPowerAuthClientConfigurationFromMap(final ReadableMap map) {

        final boolean enableUnsecureTraffic = map.hasKey("enableUnsecureTraffic") ? map.getBoolean("enableUnsecureTraffic") : PowerAuthClientConfiguration.DEFAULT_ALLOW_UNSECURED_CONNECTION;
        final int connectionTimeout = map.hasKey("connectionTimeout") ? map.getInt("connectionTimeout") * 1000 : PowerAuthClientConfiguration.DEFAULT_CONNECTION_TIMEOUT;
        final int readTimeout = map.hasKey("readTimeout") ? map.getInt("readTimeout") * 1000 : PowerAuthClientConfiguration.DEFAULT_READ_TIMEOUT;
        final ReadableArray customHeaders = map.getArray("customHttpHeaders");
        final ReadableMap basicAuth = map.getMap("basicHttpAuthentication");

        final PowerAuthClientConfiguration.Builder paClientConfigBuilder = new PowerAuthClientConfiguration.Builder();
        if (enableUnsecureTraffic) {
            paClientConfigBuilder.clientValidationStrategy(new HttpClientSslNoValidationStrategy());
            paClientConfigBuilder.allowUnsecuredConnection(true);
        }
        if (customHeaders != null && customHeaders.size() > 0) {
            for (int i = 0; i < customHeaders.size(); i++) {
                ReadableMap object = customHeaders.getMap(i);
                String name = object.getString("name");
                String value = object.getString("value");
                if (name != null && value != null) {
                    paClientConfigBuilder.requestInterceptor(new CustomHeaderRequestInterceptor(name, value));
                }
            }
        }
        if (basicAuth != null) {
            String username = basicAuth.getString("username");
            String password = basicAuth.getString("password");
            if (username != null && password != null) {
                paClientConfigBuilder.requestInterceptor(new BasicHttpAuthenticationRequestInterceptor(username, password));
            }
        }
        paClientConfigBuilder.timeouts(connectionTimeout, readTimeout);
        return paClientConfigBuilder.build();
    }

    /**
     * Convert ReadableMaps to {@link PowerAuthKeychainConfiguration} object.
     * @param keychainMap Map with keychain configuration.
     * @param biometryMap Map with biometry configuration.
     * @return {@link PowerAuthKeychainConfiguration} created from given maps.
     */
    private static @NonNull PowerAuthKeychainConfiguration getPowerAuthKeychainConfigurationFromMap(final ReadableMap keychainMap, final ReadableMap biometryMap) {
        // Biometry configuration
        final boolean linkItemsToCurrentSet = biometryMap.hasKey("linkItemsToCurrentSet") ? biometryMap.getBoolean("linkItemsToCurrentSet") : PowerAuthKeychainConfiguration.DEFAULT_LINK_BIOMETRY_ITEMS_TO_CURRENT_SET;
        final boolean confirmBiometricAuthentication = biometryMap.hasKey("confirmBiometricAuthentication") ? biometryMap.getBoolean("confirmBiometricAuthentication") : PowerAuthKeychainConfiguration.DEFAULT_CONFIRM_BIOMETRIC_AUTHENTICATION;
        final boolean authenticateOnBiometricKeySetup = biometryMap.hasKey("authenticateOnBiometricKeySetup") ? biometryMap.getBoolean("authenticateOnBiometricKeySetup") : PowerAuthKeychainConfiguration.DEFAULT_AUTHENTICATE_ON_BIOMETRIC_KEY_SETUP;
        // Keychain configuration
        final int minimalRequiredKeychainProtection = getKeychainProtectionFromString(keychainMap.getString("minimalRequiredKeychainProtection"));
        return new PowerAuthKeychainConfiguration.Builder()
                .linkBiometricItemsToCurrentSet(linkItemsToCurrentSet)
                .confirmBiometricAuthentication(confirmBiometricAuthentication)
                .authenticateOnBiometricKeySetup(authenticateOnBiometricKeySetup)
                .minimalRequiredKeychainProtection(minimalRequiredKeychainProtection)
                .build();
    }

    @ReactMethod
    public void hasValidActivation(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.hasValidActivation());
            }
        });
    }

    @ReactMethod
    public void canStartActivation(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.canStartActivation());
            }
        });
    }

    @ReactMethod
    public void hasPendingActivation(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.hasPendingActivation());
            }
        });
    }

    @ReactMethod
    public void activationIdentifier(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.getActivationIdentifier());
            }
        });
    }

    @ReactMethod
    public  void activationFingerprint(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.getActivationFingerprint());
            }
        });
    }

    @ReactMethod
    public void getExternalPendingOperation(String instanceId, final Promise promise) {
        // Not supported on Android
        promise.resolve(null);
    }

    @ReactMethod
    public void fetchActivationStatus(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                sdk.fetchActivationStatusWithCallback(context, new IActivationStatusListener() {
                    @Override
                    public void onActivationStatusSucceed(ActivationStatus status) {
                        WritableMap map = Arguments.createMap();
                        map.putString("state", getStatusCode(status.state));
                        map.putInt("failCount", status.failCount);
                        map.putInt("maxFailCount", status.maxFailCount);
                        map.putInt("remainingAttempts", status.getRemainingAttempts());
                        map.putMap("customObject", Arguments.makeNativeMap(status.getCustomObject()));
                        promise.resolve(map);
                    }

                    @Override
                    public void onActivationStatusFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void createActivation(String instanceId, final ReadableMap activation, final Promise promise) {

        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                PowerAuthActivation.Builder paActivation = null;

                String name = activation.getString("activationName");
                String activationCode = activation.hasKey("activationCode") ? activation.getString("activationCode") : null;
                String recoveryCode = activation.hasKey("recoveryCode") ? activation.getString("recoveryCode") : null;
                String recoveryPuk = activation.hasKey("recoveryPuk") ? activation.getString("recoveryPuk") : null;
                ReadableMap identityAttributes = activation.hasKey("identityAttributes") ? activation.getMap("identityAttributes") : null;
                String extras = activation.hasKey("extras") ? activation.getString("extras") : null;
                ReadableMap customAttributes = activation.hasKey("customAttributes") ? activation.getMap("customAttributes") : null;
                String additionalActivationOtp = activation.hasKey("additionalActivationOtp") ? activation.getString("additionalActivationOtp") : null;

                try {
                    if (activationCode != null) {
                        paActivation = PowerAuthActivation.Builder.activation(activationCode, name);
                    } else if (recoveryCode != null && recoveryPuk != null) {
                        paActivation = PowerAuthActivation.Builder.recoveryActivation(recoveryCode, recoveryPuk, name);
                    } else if (identityAttributes != null) {
                        paActivation = PowerAuthActivation.Builder.customActivation(getStringMap(identityAttributes), name);
                    }

                    if (paActivation == null) {
                        promise.reject(Errors.EC_INVALID_ACTIVATION_OBJECT, "Activation object is invalid.");
                        return;
                    }

                    if (extras != null) {
                        paActivation.setExtras(extras);
                    }

                    if (customAttributes != null) {
                        paActivation.setCustomAttributes(customAttributes.toHashMap());
                    }

                    if (additionalActivationOtp != null) {
                        paActivation.setAdditionalActivationOtp(additionalActivationOtp);
                    }

                    sdk.createActivation(paActivation.build(), new ICreateActivationListener() {
                        @Override
                        public void onActivationCreateSucceed(@NonNull CreateActivationResult result) {
                            WritableMap map = Arguments.createMap();
                            map.putString("activationFingerprint", result.getActivationFingerprint());
                            RecoveryData rData = result.getRecoveryData();
                            if (rData != null) {
                                WritableMap recoveryMap = Arguments.createMap();
                                recoveryMap.putString("recoveryCode", rData.recoveryCode);
                                recoveryMap.putString("puk", rData.puk);
                                map.putMap("activationRecovery", recoveryMap);
                            } else {
                                map.putMap("activationRecovery", null);
                            }
                            Map<String, Object> customAttributes = result.getCustomActivationAttributes();
                            map.putMap("customAttributes", customAttributes == null ? null : Arguments.makeNativeMap(customAttributes));
                            promise.resolve(map);
                        }

                        @Override
                        public void onActivationCreateFailed(@NonNull Throwable t) {
                            Errors.rejectPromise(promise, t);
                        }
                    });
                } catch (Exception e) {
                    Errors.rejectPromise(promise, e);
                }
            }
        });
    }

    @ReactMethod
    public void commitActivation(String instanceId, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, sdk -> {
            final PowerAuthAuthentication auth = constructAuthentication(authMap, true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && authMap.getBoolean("isBiometry")) {
                final ReadableMap promptMap = authMap.hasKey("biometricPrompt") ? authMap.getMap("biometricPrompt") : null;
                final Pair<String, String> titleDesc = extractPromptStrings(promptMap);
                try {
                    final FragmentActivity fragmentActivity = (FragmentActivity) getCurrentActivity();
                    if (fragmentActivity == null) {
                        throw new WrapperException(Errors.EC_REACT_NATIVE_ERROR, "Current fragment activity is not available");
                    }
                    if (auth.getPassword() == null) {
                        throw new IllegalStateException(); // This is handled in "constructAuthentication", so should never happen.
                    }
                    sdk.commitActivation(context, fragmentActivity, titleDesc.first, titleDesc.second, auth.getPassword(), new ICommitActivationWithBiometryListener() {

                        @Override
                        public void onBiometricDialogCancelled() {
                            promise.reject(Errors.EC_BIOMETRY_CANCEL, "Biometry dialog was canceled");
                        }

                        @Override
                        public void onBiometricDialogSuccess() {
                            promise.resolve(null);
                        }

                        @Override
                        public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                            promise.reject(Errors.EC_BIOMETRY_FAILED, "Biometry dialog failed");
                        }
                    });
                } catch (Throwable t) {
                    Errors.rejectPromise(promise, t);
                }
            } else {
                int result = sdk.commitActivationWithAuthentication(context, auth);
                if (result == PowerAuthErrorCodes.SUCCEED) {
                    promise.resolve(null);
                } else {
                    promise.reject(Errors.getErrorCodeFromError(result), "Commit failed.");
                }
            }
        });
    }

    @ReactMethod
    public void removeActivationWithAuthentication(String instanceId,final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.removeActivationWithAuthentication(context, auth, new IActivationRemoveListener() {
                    @Override
                    public void onActivationRemoveSucceed() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onActivationRemoveFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void removeActivationLocal(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                try {
                    sdk.removeActivationLocal(context);
                    promise.resolve(null);
                } catch (Throwable t) {
                    Errors.rejectPromise(promise, t);
                }
            }
        });
    }

    @ReactMethod
    public void requestGetSignature(String instanceId, final ReadableMap authMap, final String uriId, @Nullable final ReadableMap params, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                Map<String, String> paramMap = params == null ? null : getStringMap(params);
                PowerAuthAuthorizationHttpHeader header = sdk.requestGetSignatureWithAuthentication(context, auth, uriId, paramMap);
                ReadableMap headerObject = getHttpHeaderObject(header);

                if (headerObject != null) {
                    promise.resolve(headerObject);
                } else {
                    promise.reject(Errors.getErrorCodeFromError(header.powerAuthErrorCode), "Signature calculation failed.");
                }
            }
        });
    }

    @ReactMethod
    public void requestSignature(String instanceId, final ReadableMap authMap, final String method, final String uriId, final  @Nullable String body, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
                PowerAuthAuthorizationHttpHeader header = sdk.requestSignatureWithAuthentication(context, auth, method, uriId, decodedBody);
                if (header.powerAuthErrorCode == PowerAuthErrorCodes.SUCCEED) {
                    WritableMap returnMap = Arguments.createMap();
                    returnMap.putString("key", header.key);
                    returnMap.putString("value", header.value);
                    promise.resolve(returnMap);
                } else {
                    promise.reject(Errors.getErrorCodeFromError(header.powerAuthErrorCode), "Signature calculation failed.");
                }
            }
        });
    }

    @ReactMethod
    public void offlineSignature(String instanceId, final ReadableMap authMap, final String uriId, final  @Nullable String body, final String nonce, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
                String signature = sdk.offlineSignatureWithAuthentication(context, auth, uriId, decodedBody, nonce);
                if (signature != null) {
                    promise.resolve(signature);
                } else {
                    promise.reject(Errors.EC_SIGNATURE_ERROR, "Signature calculation failed");
                }
            }
        });
    }

    @ReactMethod
    public void verifyServerSignedData(String instanceId, final String data, final String signature, final boolean masterKey, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                try {
                    byte[] decodedData = data.getBytes(StandardCharsets.UTF_8);
                    byte[] decodedSignature = Base64.decode(signature, Base64.NO_WRAP);
                    promise.resolve(sdk.verifyServerSignedData(decodedData, decodedSignature, masterKey));
                } catch (Exception e) {
                    Errors.rejectPromise(promise, e);
                }
            }
        });
    }

    @ReactMethod
    public void unsafeChangePassword(String instanceId, final Dynamic oldPassword, final Dynamic newPassword, final Promise promise) {
        this.usePowerAuth(instanceId, promise, sdk -> {
            final Password coreOldPassword = passwordModule.usePassword(oldPassword);
            final Password coreNewPassword = passwordModule.usePassword(newPassword);
            promise.resolve(sdk.changePasswordUnsafe(coreOldPassword, coreNewPassword));
        });
    }

    @ReactMethod
    public void changePassword(String instanceId, final Dynamic oldPassword, final Dynamic newPassword, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, sdk -> {
            final Password coreOldPassword = passwordModule.usePassword(oldPassword);
            final Password coreNewPassword = passwordModule.usePassword(newPassword);
            sdk.changePassword(context, coreOldPassword, coreNewPassword, new IChangePasswordListener() {
                @Override
                public void onPasswordChangeSucceed() {
                    promise.resolve(null);
                }

                @Override
                public void onPasswordChangeFailed(@NonNull Throwable t) {
                    Errors.rejectPromise(promise, t);
                }
            });
        });
    }

    @ReactMethod
    public void addBiometryFactor(String instanceId, final Dynamic password, final ReadableMap prompt, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, sdk -> {
            final Password corePassword = passwordModule.usePassword(password);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    final FragmentActivity fragmentActivity = (FragmentActivity) getCurrentActivity();
                    if (fragmentActivity == null) {
                        throw new IllegalStateException("Current fragment activity is not available");
                    }
                    final Pair<String, String> titleDesc = extractPromptStrings(prompt);
                    sdk.addBiometryFactor(
                            context,
                            fragmentActivity,
                            titleDesc.first,
                            titleDesc.second,
                            corePassword,
                            new IAddBiometryFactorListener() {
                                @Override
                                public void onAddBiometryFactorSucceed() {
                                    promise.resolve(null);
                                }

                                @Override
                                public void onAddBiometryFactorFailed(@NonNull PowerAuthErrorException error) {
                                    Errors.rejectPromise(promise, error);
                                }
                            });
                } catch (Exception e) {
                    Errors.rejectPromise(promise, e);
                }
            } else {
                promise.reject(Errors.EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
            }
        });
    }

    @ReactMethod
    public void hasBiometryFactor(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    promise.resolve(sdk.hasBiometryFactor(context));
                } else {
                    promise.reject(Errors.EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
                }
            }
        });
    }

    @ReactMethod
    public void removeBiometryFactor(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, sdk -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (sdk.removeBiometryFactor(context)) {
                    promise.resolve(null);
                } else {
                    if (!sdk.hasBiometryFactor(context)) {
                        promise.reject(Errors.EC_BIOMETRY_NOT_CONFIGURED, "Biometry not configured in this PowerAuth instance");
                    } else {
                        promise.reject(Errors.EC_REACT_NATIVE_ERROR, "Failed to remove biometry factor");
                    }
                }
            } else {
                promise.reject(Errors.EC_BIOMETRY_NOT_SUPPORTED, "Biometry not supported on this android version");
            }
        });
    }

    @ReactMethod
    public void getBiometryInfo(String instanceId, final Promise promise) {
        boolean isAvailable = BiometricAuthentication.isBiometricAuthenticationAvailable(this.context);
        String biometryType;
        String canAuthenticate;
        switch (BiometricAuthentication.getBiometryType(this.context)) {
            case BiometryType.NONE:
                biometryType = "NONE";
                break;
            case BiometryType.FINGERPRINT:
                biometryType = "FINGERPRINT";
                break;
            case BiometryType.FACE:
                biometryType = "FACE";
                break;
            case BiometryType.IRIS:
                biometryType = "IRIS";
                break;
            case BiometryType.GENERIC:
            default: // forward compatibility
                biometryType = "GENERIC";
                break;
        }
        switch (BiometricAuthentication.canAuthenticate(this.context)) {
            case BiometricStatus.OK:
                canAuthenticate = "OK";
                break;
            case BiometricStatus.NOT_ENROLLED:
                canAuthenticate = "NOT_ENROLLED";
                break;
            case BiometricStatus.NOT_AVAILABLE:
                canAuthenticate = "NOT_AVAILABLE";
                break;
            case BiometricStatus.NOT_SUPPORTED:
            default: // forward compatibility
                canAuthenticate = "NOT_SUPPORTED";
                break;
        }
        WritableMap map = Arguments.createMap();
        map.putBoolean("isAvailable", isAvailable);
        map.putString("biometryType", biometryType);
        map.putString("canAuthenticate", canAuthenticate);
        promise.resolve(map);
    }

    @ReactMethod
    public void fetchEncryptionKey(String instanceId, final ReadableMap authMap, final int index, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.fetchEncryptionKey(context, auth, index, new IFetchEncryptionKeyListener() {
                    @Override
                    public void onFetchEncryptionKeySucceed(@NonNull byte[] encryptedEncryptionKey) {
                        promise.resolve(Base64.encodeToString(encryptedEncryptionKey, Base64.NO_WRAP));
                    }

                    @Override
                    public void onFetchEncryptionKeyFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void signDataWithDevicePrivateKey(String instanceId, final ReadableMap authMap, final String data, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.signDataWithDevicePrivateKey(context, auth, data.getBytes(StandardCharsets.UTF_8), new IDataSignatureListener() {
                    @Override
                    public void onDataSignedSucceed(@NonNull byte[] signature) {
                        promise.resolve(Base64.encodeToString(signature, Base64.NO_WRAP));
                    }

                    @Override
                    public void onDataSignedFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void validatePassword(String instanceId, final Dynamic password, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, sdk -> {
            final Password corePassword = passwordModule.usePassword(password);
            sdk.validatePassword(context, corePassword, new IValidatePasswordListener() {
                @Override
                public void onPasswordValid() {
                    promise.resolve(null);
                }

                @Override
                public void onPasswordValidationFailed(@NonNull Throwable t) {
                    Errors.rejectPromise(promise, t);
                }
            });
        });
    }

    @ReactMethod
    public void hasActivationRecoveryData(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.hasActivationRecoveryData());
            }
        });
    }

    @ReactMethod
    public void activationRecoveryData(String instanceId, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.getActivationRecoveryData(context, auth, new IGetRecoveryDataListener() {
                    @Override
                    public void onGetRecoveryDataSucceeded(@NonNull RecoveryData recoveryData) {
                        WritableMap map = Arguments.createMap();
                        map.putString("recoveryCode", recoveryData.recoveryCode);
                        map.putString("puk", recoveryData.puk);
                        promise.resolve(map);
                    }

                    @Override
                    public void onGetRecoveryDataFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void confirmRecoveryCode(String instanceId, final String recoveryCode, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.confirmRecoveryCode(context, auth, recoveryCode, new IConfirmRecoveryCodeListener() {
                    @Override
                    public void onRecoveryCodeConfirmed(boolean alreadyConfirmed) {
                        promise.resolve(alreadyConfirmed);
                    }

                    @Override
                    public void onRecoveryCodeConfirmFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    /**
     * Validate biometric status before use.
     * @param sdk PowerAuthSDK instance
     * @throws WrapperException In case that biometry is not available for any reason.
     */
    private void validateBiometryBeforeUse(PowerAuthSDK sdk) throws WrapperException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            switch (BiometricAuthentication.canAuthenticate(context)) {
                case BiometricStatus.OK:
                    if (sdk.hasValidActivation() && !sdk.hasBiometryFactor(context)) {
                        // Has valid activation, but factor is not set
                        throw new WrapperException(Errors.EC_BIOMETRY_NOT_CONFIGURED, "Biometry factor is not configured");
                    }
                    break;
                case BiometricStatus.NOT_AVAILABLE:
                    throw new WrapperException(Errors.EC_BIOMETRY_NOT_AVAILABLE, "Biometry is not available");
                case BiometricStatus.NOT_ENROLLED:
                    throw new WrapperException(Errors.EC_BIOMETRY_NOT_ENROLLED, "Biometry is not enrolled on device");
                case BiometricStatus.NOT_SUPPORTED:
                    throw new WrapperException(Errors.EC_BIOMETRY_NOT_SUPPORTED, "Biometry is not supported");
            }
        } else {
            throw new WrapperException(Errors.EC_BIOMETRY_NOT_SUPPORTED, "Biometry is not supported");
        }
    }

    @ReactMethod
    public void authenticateWithBiometry(String instanceId, final ReadableMap prompt, final boolean makeReusable, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, sdk -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    validateBiometryBeforeUse(sdk);
                    final FragmentActivity fragmentActivity = (FragmentActivity) getCurrentActivity();
                    if (fragmentActivity == null) {
                        throw new WrapperException(Errors.EC_REACT_NATIVE_ERROR, "Current fragment activity is not available");
                    }
                    final Pair<String, String> titleDesc = extractPromptStrings(prompt);
                    sdk.authenticateUsingBiometry(
                        context,
                        fragmentActivity,
                        titleDesc.first,
                        titleDesc.second,
                        new IBiometricAuthenticationCallback() {
                            @Override
                            public void onBiometricDialogCancelled(boolean userCancel) {
                                promise.reject(Errors.EC_BIOMETRY_CANCEL, "Biometry dialog was canceled");
                            }

                            @Override
                            public void onBiometricDialogSuccess(@NonNull BiometricKeyData biometricKeyData) {
                                // Allocate native managed object object
                                final ManagedAny<byte[]> managedBytes = ManagedAny.wrap(biometricKeyData.getDerivedData());
                                // If reusable authentication is going to be created, then "keep alive" release policy is applied.
                                // Basically, the data will be available up to 10 seconds from the last access.
                                // If authentication is not reusable, then dispose biometric key after its 1st use. We still need
                                // to combine it with "expire" policy to make sure that key don't remain in memory forever.
                                final List<ReleasePolicy> releasePolicies = makeReusable
                                        ? Collections.singletonList(ReleasePolicy.keepAlive(Constants.BIOMETRY_KEY_KEEP_ALIVE_TIME))
                                        : Arrays.asList(ReleasePolicy.afterUse(1), ReleasePolicy.expire(Constants.BIOMETRY_KEY_KEEP_ALIVE_TIME));
                                final String managedId = objectRegister.registerObject(managedBytes, instanceId, releasePolicies);
                                promise.resolve(managedId);
                            }

                            @Override
                            public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                Errors.rejectPromise(promise, error);
                            }
                        }
                    );
                } catch (Exception e) {
                    Errors.rejectPromise(promise, e);
                }
            } else {
                promise.reject(Errors.EC_BIOMETRY_NOT_SUPPORTED, "Biometry not supported on this android version.");
            }
        });
    }

    // TOKEN BASED AUTHENTICATION

    @ReactMethod
    public void requestAccessToken(String instanceId, final String tokenName, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) throws Exception {
                final PowerAuthAuthentication auth = constructAuthentication(authMap, false);
                sdk.getTokenStore().requestAccessToken(context, tokenName, auth, new IGetTokenListener() {
                    @Override
                    public void onGetTokenSucceeded(@NonNull PowerAuthToken token) {
                        WritableMap response = Arguments.createMap();
                        response.putString("tokenName", token.getTokenName());
                        response.putString("tokenIdentifier", token.getTokenIdentifier());
                        promise.resolve(response);
                    }
                    @Override
                    public void onGetTokenFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void removeAccessToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                sdk.getTokenStore().removeAccessToken(context, tokenName, new IRemoveTokenListener() {
                    @Override
                    public void onRemoveTokenSucceeded() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onRemoveTokenFailed(@NonNull Throwable t) {
                        Errors.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void getLocalToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                PowerAuthToken token = sdk.getTokenStore().getLocalToken(context, tokenName);
                if (token != null) {
                    WritableMap response = Arguments.createMap();
                    response.putString("tokenName", token.getTokenName());
                    response.putString("tokenIdentifier", token.getTokenIdentifier());
                    promise.resolve(response);
                } else {
                    promise.reject(Errors.EC_LOCAL_TOKEN_NOT_AVAILABLE, "Token with this name is not in the local store.");
                }
            }
        });
    }

    @ReactMethod
    public void hasLocalToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                promise.resolve(sdk.getTokenStore().hasLocalToken(context, tokenName));
            }
        });
    }

    @ReactMethod
    public void removeLocalToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                sdk.getTokenStore().removeLocalToken(context, tokenName);
                promise.resolve(null);
            }
        });
    }

    @ReactMethod
    public void removeAllLocalTokens(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                sdk.getTokenStore().removeAllLocalTokens(context);
                promise.resolve(null);
            }
        });
    }

    @ReactMethod
    public void generateHeaderForToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(@NonNull PowerAuthSDK sdk) {
                PowerAuthToken token = sdk.getTokenStore().getLocalToken(context, tokenName);
                if (token == null) {
                    promise.reject(Errors.EC_LOCAL_TOKEN_NOT_AVAILABLE, "This token is no longer available in the local store.");
                } else if (token.canGenerateHeader()) {
                    promise.resolve(getHttpHeaderObject(token.generateHeader()));
                } else {
                    promise.reject(Errors.EC_CANNOT_GENERATE_TOKEN, "Cannot generate header for this token.");
                }
            }
        });
    }

    // ACTIVATION CODE UTIL METHODS

    @ReactMethod
    public void parseActivationCode(String activationCode, final Promise promise) {
        ActivationCode ac = ActivationCodeUtil.parseFromActivationCode(activationCode);
        if (ac != null) {
            WritableMap response = Arguments.createMap();
            response.putString("activationCode", ac.activationCode);
            if (ac.activationSignature != null) {
                response.putString("activationSignature", ac.activationSignature);
            }
            promise.resolve(response);
        } else {
            promise.reject(Errors.EC_INVALID_ACTIVATION_CODE, "Invalid activation code.");
        }
    }

    @ReactMethod
    public void validateActivationCode(String activationCode, final Promise promise) {
        promise.resolve(ActivationCodeUtil.validateActivationCode(activationCode));
    }

    @ReactMethod
    public void parseRecoveryCode(String recoveryCode, final Promise promise) {
        ActivationCode ac = ActivationCodeUtil.parseFromRecoveryCode(recoveryCode);
        if (ac != null) {
            WritableMap response = Arguments.createMap();
            response.putString("activationCode", ac.activationCode);
            if (ac.activationSignature != null) {
                response.putString("activationSignature", ac.activationSignature);
            }
            promise.resolve(response);
        } else {
            promise.reject(Errors.EC_INVALID_RECOVERY_CODE, "Invalid recovery code.");
        }
    }

    @ReactMethod
    public void validateRecoveryCode(String recoveryCode, final Promise promise) {
        promise.resolve(ActivationCodeUtil.validateRecoveryCode(recoveryCode));
    }

    @ReactMethod
    public void validateRecoveryPuk(String puk, final Promise promise) {
        promise.resolve(ActivationCodeUtil.validateRecoveryPuk(puk));
    }

    @ReactMethod
    public void validateTypedCharacter(int character, final Promise promise) {
        promise.resolve(ActivationCodeUtil.validateTypedCharacter(character));
    }

    @ReactMethod
    public void correctTypedCharacter(int character, final Promise promise) {
        int corrected = ActivationCodeUtil.validateAndCorrectTypedCharacter(character);
        if (corrected == 0) {
            promise.reject(Errors.EC_INVALID_CHARACTER, "Invalid character cannot be corrected.");
        } else {
            promise.resolve(corrected);
        }
    }


    // Helper methods

    /**
     * Translate readable map into {code Map<String, String>}.
     * @param rm Readable map to translate.
     * @return {code Map<String, String>} created from given map.
     */
    private static Map<String, String> getStringMap(ReadableMap rm) {
        Map<String, String> map = new HashMap<>();
        for (Map.Entry<String, Object> entry : rm.toHashMap().entrySet()) {
            if (entry.getValue() instanceof String) {
                map.put(entry.getKey(), (String)entry.getValue());
            }
        }
        return map;
    }

    /**
     * Translate {@link PowerAuthAuthorizationHttpHeader} into readable map.
     * @param header Header to convert.
     * @return Readable map with header values.
     */
    private static @Nullable ReadableMap getHttpHeaderObject(@NonNull PowerAuthAuthorizationHttpHeader header) {
        if (header.powerAuthErrorCode == PowerAuthErrorCodes.SUCCEED) {
            WritableMap map = Arguments.createMap();
            map.putString("key", header.key);
            map.putString("value", header.value);
            return map;
        } else {
            return null;
        }
    }

    /**
     * Translate activation status code into string representation.
     * @param state State to convert.
     * @return String representation of activation state.
     */
    @SuppressLint("DefaultLocale")
    private static String getStatusCode(int state) {
        switch (state) {
            case ActivationStatus.State_Created: return "CREATED";
            case ActivationStatus.State_Pending_Commit: return "PENDING_COMMIT";
            case ActivationStatus.State_Active: return "ACTIVE";
            case ActivationStatus.State_Blocked: return "BLOCKED";
            case ActivationStatus.State_Removed: return "REMOVED";
            case ActivationStatus.State_Deadlock: return "DEADLOCK";
            default: return String.format("STATE_UNKNOWN_%d", state);
        }
    }

    /**
     * Helper function converts input readable map to PowerAuthAuthentication object.
     * @param map Map with authentication data.
     * @param forCommit Set true if authentication is required for activation commit.
     * @return {@link PowerAuthAuthentication} instance.
     */
    @NonNull
    private PowerAuthAuthentication constructAuthentication(ReadableMap map, boolean forCommit) throws WrapperException {
        final String biometryKeyId = map.getString("biometryKeyId");
        final byte[] biometryKey;
        if (biometryKeyId != null) {
            biometryKey = objectRegister.useObject(biometryKeyId, byte[].class);
            if (biometryKey == null) {
                throw new WrapperException(Errors.EC_INVALID_NATIVE_OBJECT, "Biometric key in PowerAuthAuthentication object is no longer valid.");
            }
        } else {
            biometryKey = null;
        }
        final Password password;
        if (map.hasKey("password")) {
            password = passwordModule.usePassword(map.getDynamic("password"));
        } else {
            password = null;
        }
        if (forCommit) {
            // Authentication for activation commit
            if (password == null) {
                throw new WrapperException(Errors.EC_WRONG_PARAMETER, "PowerAuthPassword or string is required");
            }
            if (biometryKey == null) {
                return PowerAuthAuthentication.commitWithPassword(password);
            } else {
                // This is currently not supported in RN wrapper. Application has no way to create
                // commit authentication object prepared with valid biometry key. This is supported
                // in native SDK, but application has to create its own biometry-supporting infrastructure.
                //
                // We can still use this option in tests, to simulate biometry-related operations
                // with no user's interaction.
                return PowerAuthAuthentication.commitWithPasswordAndBiometry(password, biometryKey);
            }
        } else {
            // Authentication for data signing
            if (biometryKey != null) {
                return PowerAuthAuthentication.possessionWithBiometry(biometryKey);
            } else if (password != null) {
                return PowerAuthAuthentication.commitWithPassword(password);
            } else  {
                return PowerAuthAuthentication.possession();
            }
        }
    }

    /**
     * Extract strings from biometric prompt.
     * @param prompt Map with prompt data.
     * @return Pair where first item is title and second description for biometric dialog.
     */
    @NonNull
    private Pair<String, String> extractPromptStrings(ReadableMap prompt) {
        String title = prompt != null ? prompt.getString("promptTitle") : null;
        String description = prompt != null ? prompt.getString("promptMessage") : null;
        if (title == null) {
            title = Constants.MISSING_REQUIRED_STRING;
        }
        if (description == null) {
            description = Constants.MISSING_REQUIRED_STRING;
        }
        return Pair.create(title, description);
    }

    // PowerAuthBlock instance

    /**
     * The PowerAuthBlock is a closure-like interface, called with a valid instance of PowerAuthSDK.
     */
    private interface PowerAuthBlock {
        /**
         * Execute any functionality with PowerAuthSDK instance.
         * @param sdk PowerAuthSDK instance.
         */
        void run(@NonNull PowerAuthSDK sdk) throws Exception;
    }

    /**
     * Get PowerAuthSDK instance from the list of instances and run PowerAuthBlock with the instance.
     * @param instanceId Instance identifier
     * @param promise Promise to resolve TS call.
     * @param block Block to execute with acquired PowerAuthSDK instance.
     */
    private void usePowerAuth(@Nonnull String instanceId, final Promise promise, PowerAuthBlock block) {
        try {
            final PowerAuthSDK instance = getPowerAuthInstance(instanceId);
            if (instance != null) {
                block.run(instance);
            } else {
                promise.reject(Errors.EC_INSTANCE_NOT_CONFIGURED, "This instance is not configured.");
            }
        } catch (Throwable e) {
            Errors.rejectPromise(promise, e);
        }
    }

    /**
     * Get PowerAuthSDK instance from the list of instances and run PowerAuthBlock with the instance on main thread.
     * @param instanceId Instance identifier
     * @param promise Promise to resolve TS call.
     * @param block Block to execute on main thread with acquired PowerAuthSDK instance.
     */
    private void usePowerAuthOnMainThread(@Nonnull final String instanceId, final Promise promise, final PowerAuthBlock block) {
        // Note: Uses internal PowerAuth mobile SDK class, so we'll need to reimplement this in some future release.
        //       Right now it's OK to use native SDKs class, due to tight dependency between RN wrapper and mobile SDK.
        MainThreadExecutor.getInstance().execute(new Runnable() {
            @Override
            public void run() {
                usePowerAuth(instanceId, promise, block);
            }
        });
    }

    // Instances register

    @Nullable
    private PowerAuthSDK getPowerAuthInstance(String instanceId) throws PowerAuthErrorException {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw new PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Instance identifier is missing or empty or forbidden string");
        }
        return objectRegister.findObject(instanceId, PowerAuthSDK.class);
    }

    private void unregisterPowerAuthInstance(String instanceId) throws PowerAuthErrorException {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw new PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Instance identifier is missing or empty or forbidden string");
        }
        objectRegister.removeAllObjectsWithTag(instanceId);
    }

    private boolean registerPowerAuthInstance(String instanceId, ObjectRegister.ObjectFactory factory) throws Throwable {
        if (!objectRegister.isValidObjectId(instanceId)) {
            throw new PowerAuthErrorException(PowerAuthErrorCodes.WRONG_PARAMETER, "Instance identifier is missing or empty or forbidden string");
        }
        return objectRegister.registerObjectWithId(instanceId, instanceId, Collections.singletonList(ReleasePolicy.manual()), factory);
    }
}