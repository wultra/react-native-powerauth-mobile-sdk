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

import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import java.io.IOException;
import java.lang.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
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
import io.getlime.security.powerauth.networking.exceptions.ErrorResponseApiException;
import io.getlime.security.powerauth.networking.exceptions.FailedApiException;
import io.getlime.security.powerauth.sdk.*;
import io.getlime.security.powerauth.networking.ssl.*;
import io.getlime.security.powerauth.networking.response.*;
import io.getlime.security.powerauth.core.*;
import io.getlime.security.powerauth.exception.*;
import io.getlime.security.powerauth.sdk.impl.MainThreadExecutor;

@SuppressWarnings("unused")
public class PowerAuthRNModule extends ReactContextBaseJavaModule {

    interface PowerAuthBlock {
        void run(PowerAuthSDK sdk);
    }

    private final ReactApplicationContext context;
    private final HashMap<String, PowerAuthSDK> instances = new HashMap<>();

    public PowerAuthRNModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "PowerAuth";
    }

    @ReactMethod
    public void isConfigured(@Nonnull String instanceId, final Promise promise) {
        promise.resolve(this.instances.containsKey(instanceId));
    }

    @ReactMethod
    public void configure(String instanceId, final ReadableMap configuration, final ReadableMap clientConfiguration, final ReadableMap biometryConfiguration, final ReadableMap keychainConfiguration, final Promise promise) {
        // Create configurations from maps
        final PowerAuthConfiguration paConfig = getPowerAuthConfigurationFromMap(instanceId, configuration);
        if (paConfig == null) {
            promise.reject(EC_REACT_NATIVE_ERROR, "PowerAuthConfiguration parameter is wrong");
            return;
        }
        final PowerAuthClientConfiguration paClientConfig = getPowerAuthClientConfigurationFromMap(clientConfiguration);
        final PowerAuthKeychainConfiguration paKeychainConfig = getPowerAuthKeychainConfigurationFromMap(keychainConfiguration, biometryConfiguration);
        // Configure the instance
        try {
            if (this.instances.containsKey(instanceId)) {
                promise.reject(EC_REACT_NATIVE_ERROR, "PowerAuth object with this instanceId is already configured.");
            } else {
                final PowerAuthSDK powerAuth = new PowerAuthSDK.Builder(paConfig)
                        .clientConfiguration(paClientConfig)
                        .keychainConfiguration(paKeychainConfig)
                        .build(this.context);
                this.instances.put(instanceId, powerAuth);
                promise.resolve(true);
            }
        } catch (PowerAuthErrorException e) {
            promise.reject(EC_REACT_NATIVE_ERROR, "Failed to create native PowerAuthSDK object", e);
        }
    }

    @ReactMethod
    public void deconfigure(String instanceId, final Promise promise) {
        this.instances.remove(instanceId);
        promise.resolve(null);
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
        final boolean enableUnsecureTraffic = map.hasKey("enableUnsecureTraffic") && map.getBoolean("enableUnsecureTraffic");
        final Integer connectionTimeout = map.hasKey("connectionTimeout") ? map.getInt("connectionTimeout") : null;
        final Integer readTimeout = map.hasKey("readTimeout") ? map.getInt("readTimeout") : null;
        final PowerAuthClientConfiguration.Builder paClientConfigBuilder = new PowerAuthClientConfiguration.Builder();
        if (enableUnsecureTraffic) {
            paClientConfigBuilder.clientValidationStrategy(new HttpClientSslNoValidationStrategy());
            paClientConfigBuilder.allowUnsecuredConnection(true);
        }
        if (connectionTimeout != null && readTimeout != null) {
            paClientConfigBuilder.timeouts(connectionTimeout, readTimeout);
        }
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
        final boolean linkItemsToCurrentSet = biometryMap.hasKey("linkItemsToCurrentSet") && biometryMap.getBoolean("linkItemsToCurrentSet");
        final boolean confirmBiometricAuthentication = biometryMap.hasKey("confirmBiometricAuthentication") && biometryMap.getBoolean("confirmBiometricAuthentication");
        final boolean authenticateOnBiometricKeySetup = biometryMap.hasKey("authenticateOnBiometricKeySetup") && biometryMap.getBoolean("authenticateOnBiometricKeySetup");
        // Keychain configuration
        final int minimalRequiredKeychainProtection = getKeychainProtectionFromString(biometryMap.getString("minimalRequiredKeychainProtection"));
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
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.hasValidActivation());
            }
        });
    }

    @ReactMethod
    public void canStartActivation(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.canStartActivation());
            }
        });
    }

    @ReactMethod
    public void hasPendingActivation(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.hasPendingActivation());
            }
        });
    }

    @ReactMethod
    public void activationIdentifier(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.getActivationIdentifier());
            }
        });
    }

    @ReactMethod
    public  void activationFingerprint(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.getActivationFingerprint());
            }
        });
    }

    @ReactMethod
    public void fetchActivationStatus(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                sdk.fetchActivationStatusWithCallback(context, new IActivationStatusListener() {
                    @Override
                    public void onActivationStatusSucceed(ActivationStatus status) {
                        WritableMap map = Arguments.createMap();
                        map.putString("state", PowerAuthRNModule.getStatusCode(status.state));
                        map.putInt("failCount", status.failCount);
                        map.putInt("maxFailCount", status.maxFailCount);
                        map.putInt("remainingAttempts", status.getRemainingAttempts());
                        promise.resolve(map);
                    }

                    @Override
                    public void onActivationStatusFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void createActivation(String instanceId, final ReadableMap activation, final Promise promise) {

        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
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
                        paActivation = PowerAuthActivation.Builder.customActivation(PowerAuthRNModule.getStringMap(identityAttributes), name);
                    }

                    if (paActivation == null) {
                        promise.reject(EC_INVALID_ACTIVATION_OBJECT, "Activation object is invalid.");
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
                            PowerAuthRNModule.rejectPromise(promise, t);
                        }
                    });
                } catch (Exception e) {
                    PowerAuthRNModule.rejectPromise(promise, e);
                }
            }
        });
    }

    @ReactMethod
    public void commitActivation(String instanceId, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                if (auth.usePassword == null) {
                    promise.reject(EC_PASSWORD_NOT_SET, "Password is not set.");
                    return;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && authMap.getBoolean("useBiometry")) {
                    String title = authMap.getString("biometryTitle");
                    if (title == null) {
                        title = " "; // to prevent crash
                    }
                    String message = authMap.getString("biometryMessage");
                    if (message == null) {
                        message = " "; // to prevent crash
                    }
                    try {
                        final FragmentActivity fragmentActivity = (FragmentActivity) getCurrentActivity();
                        if (fragmentActivity == null) {
                            throw new IllegalStateException("Current fragment activity is not available");
                        }
                        sdk.commitActivation(context, fragmentActivity, title, message, auth.usePassword, new ICommitActivationWithBiometryListener() {

                            @Override
                            public void onBiometricDialogCancelled() {
                                promise.reject(EC_BIOMETRY_CANCEL, "Biometry dialog was canceled");
                            }

                            @Override
                            public void onBiometricDialogSuccess() {
                                promise.resolve(null);
                            }

                            @Override
                            public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                promise.reject(EC_BIOMETRY_FAILED, "Biometry dialog failed");
                            }
                        });
                    } catch (Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                } else {
                    int result = sdk.commitActivationWithPassword(context, auth.usePassword);
                    if (result == PowerAuthErrorCodes.SUCCEED) {
                        promise.resolve(null);
                    } else {
                        promise.reject(PowerAuthRNModule.getErrorCodeFromError(result), "Commit failed.");
                    }
                }
            }
        });
    }

    @ReactMethod
    public void removeActivationWithAuthentication(String instanceId,final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                sdk.removeActivationWithAuthentication(context, auth, new IActivationRemoveListener() {
                    @Override
                    public void onActivationRemoveSucceed() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onActivationRemoveFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
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
            public void run(PowerAuthSDK sdk) {
                try {
                    sdk.removeActivationLocal(context);
                    promise.resolve(null);
                } catch (Throwable t) {
                    PowerAuthRNModule.rejectPromise(promise, t);
                }
            }
        });
    }

    @ReactMethod
    public void requestGetSignature(String instanceId, final ReadableMap authMap, final String uriId, @Nullable final ReadableMap params, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                Map<String, String> paramMap = params == null ? null : PowerAuthRNModule.getStringMap(params);
                PowerAuthAuthorizationHttpHeader header = sdk.requestGetSignatureWithAuthentication(context, auth, uriId, paramMap);
                ReadableMap headerObject = PowerAuthRNModule.getHttpHeaderObject(header);

                if (headerObject != null) {
                    promise.resolve(headerObject);
                } else {
                    promise.reject(PowerAuthRNModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
                }
            }
        });
    }

    @ReactMethod
    public void requestSignature(String instanceId, final ReadableMap authMap, final String method, final String uriId, final  @Nullable String body, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
                PowerAuthAuthorizationHttpHeader header = sdk.requestSignatureWithAuthentication(context, auth, method, uriId, decodedBody);
                if (header.powerAuthErrorCode == PowerAuthErrorCodes.SUCCEED) {
                    WritableMap returnMap = Arguments.createMap();
                    returnMap.putString("key", header.key);
                    returnMap.putString("value", header.value);
                    promise.resolve(returnMap);
                } else {
                    promise.reject(PowerAuthRNModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
                }
            }
        });
    }

    @ReactMethod
    public void offlineSignature(String instanceId, final ReadableMap authMap, final String uriId, final  @Nullable String body, final String nonce, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
                String signature = sdk.offlineSignatureWithAuthentication(context, auth, uriId, decodedBody, nonce);
                if (signature != null) {
                    promise.resolve(signature);
                } else {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Signature failed");
                }
            }
        });
    }

    @ReactMethod
    public void verifyServerSignedData(String instanceId, final String data, final String signature, final boolean masterKey, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                try {
                    byte[] decodedData = data.getBytes(StandardCharsets.UTF_8);
                    byte[] decodedSignature = Base64.decode(signature, Base64.DEFAULT);
                    promise.resolve(sdk.verifyServerSignedData(decodedData, decodedSignature, masterKey));
                } catch (Exception e) {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Verify failed");
                }
            }
        });
    }

    @ReactMethod
    public void unsafeChangePassword(String instanceId, final String oldPassword, final String newPassword, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.changePasswordUnsafe(oldPassword, newPassword));
            }
        });
    }

    @ReactMethod
    public void changePassword(String instanceId, final String oldPassword, final String newPassword, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                sdk.changePassword(context, oldPassword, newPassword, new IChangePasswordListener() {
                    @Override
                    public void onPasswordChangeSucceed() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onPasswordChangeFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void addBiometryFactor(String instanceId, final String password, final String title, final String description, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        final FragmentActivity fragmentActivity = (FragmentActivity) getCurrentActivity();
                        if (fragmentActivity == null) {
                            throw new IllegalStateException("Current fragment activity is not available");
                        }
                        sdk.addBiometryFactor(
                                context,
                                fragmentActivity,
                                title,
                                description,
                                password,
                                new IAddBiometryFactorListener() {
                                    @Override
                                    public void onAddBiometryFactorSucceed() {
                                        promise.resolve(null);
                                    }

                                    @Override
                                    public void onAddBiometryFactorFailed(@NonNull PowerAuthErrorException error) {
                                        PowerAuthRNModule.rejectPromise(promise, error);
                                    }
                                });
                    } catch (Exception e) {
                        PowerAuthRNModule.rejectPromise(promise, e);
                    }
                } else {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
                }
            }
        });
    }

    @ReactMethod
    public void hasBiometryFactor(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    promise.resolve(sdk.hasBiometryFactor(context));
                } else {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
                }
            }
        });
    }

    @ReactMethod
    public void removeBiometryFactor(String instanceId, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    promise.resolve(sdk.removeBiometryFactor(context));
                } else {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
                }
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
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                sdk.fetchEncryptionKey(context, auth, index, new IFetchEncryptionKeyListener() {
                    @Override
                    public void onFetchEncryptionKeySucceed(byte[] encryptedEncryptionKey) {
                        promise.resolve(Base64.encodeToString(encryptedEncryptionKey, Base64.DEFAULT));
                    }

                    @Override
                    public void onFetchEncryptionKeyFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
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
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                sdk.signDataWithDevicePrivateKey(context, auth, data.getBytes(StandardCharsets.UTF_8), new IDataSignatureListener() {
                    @Override
                    public void onDataSignedSucceed(byte[] signature) {
                        promise.resolve(Base64.encodeToString(signature, Base64.DEFAULT));
                    }

                    @Override
                    public void onDataSignedFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void validatePassword(String instanceId, final String password, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                sdk.validatePasswordCorrect(context, password, new IValidatePasswordListener() {
                    @Override
                    public void onPasswordValid() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onPasswordValidationFailed(Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void hasActivationRecoveryData(String instanceId, final Promise promise) {
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.hasActivationRecoveryData());
            }
        });
    }

    @ReactMethod
    public void activationRecoveryData(String instanceId, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
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
                        PowerAuthRNModule.rejectPromise(promise, t);
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
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                sdk.confirmRecoveryCode(context, auth, recoveryCode, new IConfirmRecoveryCodeListener() {
                    @Override
                    public void onRecoveryCodeConfirmed(boolean alreadyConfirmed) {
                        promise.resolve(alreadyConfirmed);
                    }

                    @Override
                    public void onRecoveryCodeConfirmFailed(@NonNull Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
                    }
                });
            }
        });
    }

    @ReactMethod
    public void authenticateWithBiometry(String instanceId, final String title, final String description, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuthOnMainThread(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        sdk.authenticateUsingBiometry(
                            context,
                            (FragmentActivity) getCurrentActivity(),
                            title,
                            description,
                            new IBiometricAuthenticationCallback() {
                                @Override
                                public void onBiometricDialogCancelled(boolean userCancel) {
                                    promise.reject(EC_BIOMETRY_CANCEL, "Biometry dialog was canceled");
                                }

                                @Override
                                public void onBiometricDialogSuccess(@NonNull BiometricKeyData biometricKeyData) {
                                    String base64 = new String(Base64.encode(biometricKeyData.getDerivedData(), Base64.DEFAULT));
                                    promise.resolve(base64);
                                }

                                @Override
                                public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                    promise.reject(EC_BIOMETRY_FAILED, "Biometry dialog failed");
                                }
                            }
                        );
                    } catch (Exception e) {
                        PowerAuthRNModule.rejectPromise(promise, e);
                    }
                } else {
                    promise.reject(EC_REACT_NATIVE_ERROR, "Biometry not supported on this android version.");
                }
            }
        });
    }

    /** TOKEN BASED AUTHENTICATION  */

    @ReactMethod
    public void requestAccessToken(String instanceId, final String tokenName, final ReadableMap authMap, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                sdk.getTokenStore().requestAccessToken(context, tokenName, auth, new IGetTokenListener() {
                    @Override
                    public void onGetTokenSucceeded(@NonNull PowerAuthToken token) {
                        WritableMap response = Arguments.createMap();
                        response.putBoolean("isValid", token.isValid());
                        response.putBoolean("canGenerateHeader", token.canGenerateHeader());
                        response.putString("tokenName", token.getTokenName());
                        response.putString("tokenIdentifier", token.getTokenIdentifier());
                        promise.resolve(response);
                    }
                    @Override
                    public void onGetTokenFailed(@NonNull Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
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
            public void run(PowerAuthSDK sdk) {
                sdk.getTokenStore().removeAccessToken(context, tokenName, new IRemoveTokenListener() {
                    @Override
                    public void onRemoveTokenSucceeded() {
                        promise.resolve(null);
                    }

                    @Override
                    public void onRemoveTokenFailed(@NonNull Throwable t) {
                        PowerAuthRNModule.rejectPromise(promise, t);
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
            public void run(PowerAuthSDK sdk) {
                PowerAuthToken token = sdk.getTokenStore().getLocalToken(context, tokenName);
                if (token != null) {
                    WritableMap response = Arguments.createMap();
                    response.putBoolean("isValid", token.isValid());
                    response.putBoolean("canGenerateHeader", token.canGenerateHeader());
                    response.putString("tokenName", token.getTokenName());
                    response.putString("tokenIdentifier", token.getTokenIdentifier());
                    promise.resolve(response);
                } else {
                    promise.reject(EC_LOCAL_TOKEN_NOT_AVAILABLE, "Token with this name is not in the local store.");
                }
            }
        });
    }

    @ReactMethod
    public void hasLocalToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                promise.resolve(sdk.getTokenStore().hasLocalToken(context, tokenName));
            }
        });
    }

    @ReactMethod
    public void removeLocalToken(String instanceId, final String tokenName, final Promise promise) {
        final Context context = this.context;
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
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
            public void run(PowerAuthSDK sdk) {
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
            public void run(PowerAuthSDK sdk) {
                PowerAuthToken token = sdk.getTokenStore().getLocalToken(context, tokenName);
                if (token == null) {
                    promise.reject(EC_LOCAL_TOKEN_NOT_AVAILABLE, "This token is no longer available in the local store.");
                } else if (token.canGenerateHeader()) {
                    promise.resolve(PowerAuthRNModule.getHttpHeaderObject(token.generateHeader()));
                } else {
                    promise.reject(EC_CANNOT_GENERATE_TOKEN, "Cannot generate header for this token.");
                }
            }
        });
    }

    /** ACTIVATION CODE UTIL METHODS */

    @ReactMethod
    public void parseActivationCode(String activationCode, final Promise promise) {
        ActivationCode ac = ActivationCodeUtil.parseFromActivationCode(activationCode);
        if (ac != null) {
            WritableMap response = Arguments.createMap();
            response.putString("activationCode", ac.activationCode);
            response.putString("activationSignature", ac.activationSignature);
            promise.resolve(response);
        } else {
            promise.reject(EC_INVALID_ACTIVATION_CODE, "Invalid activation code.");
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
            response.putString("activationSignature", ac.activationSignature);
            promise.resolve(response);
        } else {
            promise.reject(EC_INVALID_RECOVERY_CODE, "Invalid recovery code.");
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
            promise.reject(EC_INVALID_CHARACTER, "Invalid character cannot be corrected.");
        } else {
            promise.resolve(corrected);
        }
    }

    /** HELPER METHODS */

    private void usePowerAuth(@Nonnull String instanceId, final Promise promise, PowerAuthBlock block) {
        if (!this.instances.containsKey(instanceId)) {
            promise.reject(EC_INSTANCE_NOT_CONFIGURED, "This instance is not configured.");
            return;
        }
        block.run(this.instances.get(instanceId));
    }

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

    private static Map<String, String> getStringMap(ReadableMap rm) {
        Map<String, String> map = new HashMap<>();
        for (Map.Entry<String, Object> entry : rm.toHashMap().entrySet()) {
            if (entry.getValue() instanceof String) {
                map.put(entry.getKey(), (String)entry.getValue());
            }
        }
        return map;
    }

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

    private static PowerAuthAuthentication constructAuthentication(ReadableMap map) {
        PowerAuthAuthentication auth = new PowerAuthAuthentication();
        auth.usePossession = map.getBoolean("usePossession");
        String biometryKey = map.getString("biometryKey");
        if (biometryKey != null) {
            auth.useBiometry = Base64.decode(biometryKey, Base64.DEFAULT);
        }
        auth.usePassword = map.getString("userPassword");
        return auth;
    }

    private static void rejectPromise(Promise promise, Throwable t) {
        @Nonnull String code = EC_REACT_NATIVE_ERROR; // fallback code
        String message = t.getMessage();
        WritableMap userInfo = null;

        if (t instanceof PowerAuthErrorException) {
            // Standard PowerAuthErrorException, containing enumeration with error code.
            code = getErrorCodeFromError(((PowerAuthErrorException)t).getPowerAuthErrorCode());
        } else if (t instanceof FailedApiException) {
            // FailedApiException or more specialized ErrorResponseApiException
            final FailedApiException failedApiException = (FailedApiException)t;
            final int httpStatusCode = failedApiException.getResponseCode();
            if (httpStatusCode == 401) {
                code = EC_AUTHENTICATION_ERROR;
                message = "Unauthorized";
            } else {
                code = EC_RESPONSE_ERROR;
            }
            //
            userInfo = Arguments.createMap();
            userInfo.putInt("httpStatusCode", httpStatusCode);
            userInfo.putString("responseBody", failedApiException.getResponseBody());
            if (t instanceof ErrorResponseApiException) {
                // ErrorResponseApiException is more specialized version of FailedApiException, containing
                // an additional data.
                final ErrorResponseApiException errorResponseApiException = (ErrorResponseApiException)t;
                final int currentRecoveryPukIndex = errorResponseApiException.getCurrentRecoveryPukIndex();
                if (currentRecoveryPukIndex > 0) {
                    userInfo.putInt("currentRecoveryPukIndex", currentRecoveryPukIndex);
                }
                userInfo.putString("serverResponseCode", errorResponseApiException.getErrorResponse().getCode());
                userInfo.putString("serverResponseMessage", errorResponseApiException.getErrorResponse().getMessage());
            }
        } else if (t instanceof IOException) {
            // This is wrong, PowerAuth SDK should wrap such exception and report network related failure.
            code = EC_NETWORK_ERROR;
        }

        if (message != null && userInfo != null) {
            promise.reject(code, message, t, userInfo);
        } else if (message != null) {
            promise.reject(code, message, t);
        } else if (userInfo != null) {
            promise.reject(code, t, userInfo);
        } else {
            promise.reject(code, t);
        }
    }

    @SuppressLint("DefaultLocale")
    private static String getErrorCodeFromError(int error) {
        switch (error) {
            case PowerAuthErrorCodes.SUCCEED: return EC_SUCCEED;
            case PowerAuthErrorCodes.NETWORK_ERROR: return EC_NETWORK_ERROR;
            case PowerAuthErrorCodes.SIGNATURE_ERROR: return EC_SIGNATURE_ERROR;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_STATE: return EC_INVALID_ACTIVATION_STATE;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_DATA: return EC_INVALID_ACTIVATION_DATA;
            case PowerAuthErrorCodes.MISSING_ACTIVATION: return EC_MISSING_ACTIVATION;
            case PowerAuthErrorCodes.PENDING_ACTIVATION: return EC_PENDING_ACTIVATION;
            case PowerAuthErrorCodes.BIOMETRY_CANCEL: return EC_BIOMETRY_CANCEL;
            case PowerAuthErrorCodes.OPERATION_CANCELED: return EC_OPERATION_CANCELED;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_CODE: return EC_INVALID_ACTIVATION_CODE;
            case PowerAuthErrorCodes.INVALID_TOKEN: return EC_INVALID_TOKEN;
            case PowerAuthErrorCodes.ENCRYPTION_ERROR: return EC_ENCRYPTION_ERROR;
            case PowerAuthErrorCodes.WRONG_PARAMETER: return EC_WRONG_PARAMETER;
            case PowerAuthErrorCodes.PROTOCOL_UPGRADE: return EC_PROTOCOL_UPGRADE;
            case PowerAuthErrorCodes.PENDING_PROTOCOL_UPGRADE: return EC_PENDING_PROTOCOL_UPGRADE;
            case PowerAuthErrorCodes.BIOMETRY_NOT_SUPPORTED: return EC_BIOMETRY_NOT_SUPPORTED;
            case PowerAuthErrorCodes.BIOMETRY_NOT_AVAILABLE: return EC_BIOMETRY_NOT_AVAILABLE;
            case PowerAuthErrorCodes.BIOMETRY_NOT_RECOGNIZED: return EC_BIOMETRY_NOT_RECOGNIZED;
            case PowerAuthErrorCodes.INSUFFICIENT_KEYCHAIN_PROTECTION: return EC_INSUFFICIENT_KEYCHAIN_PROTECTION;
            case PowerAuthErrorCodes.BIOMETRY_LOCKOUT: return EC_BIOMETRY_LOCKOUT;
            default: return String.format("UNKNOWN_%d", error);
        }
    }

    // Error constants reported back to RN

    // RN specific

    private static final String EC_REACT_NATIVE_ERROR = "REACT_NATIVE_ERROR";
    private static final String EC_AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR";
    private static final String EC_RESPONSE_ERROR = "RESPONSE_ERROR";
    private static final String EC_INSTANCE_NOT_CONFIGURED = "INSTANCE_NOT_CONFIGURED";
    private static final String EC_INVALID_CHARACTER = "INVALID_CHARACTER";
    private static final String EC_INVALID_RECOVERY_CODE = "INVALID_RECOVERY_CODE";
    private static final String EC_CANNOT_GENERATE_TOKEN = "CANNOT_GENERATE_TOKEN";
    private static final String EC_LOCAL_TOKEN_NOT_AVAILABLE = "LOCAL_TOKEN_NOT_AVAILABLE";
    private static final String EC_BIOMETRY_FAILED = "BIOMETRY_FAILED";
    private static final String EC_PASSWORD_NOT_SET = "PASSWORD_NOT_SET";
    private static final String EC_INVALID_ACTIVATION_OBJECT = "INVALID_ACTIVATION_OBJECT";

    // Translated PowerAuthErrorCodes

    private static final String EC_SUCCEED = "SUCCEED";
    private static final String EC_NETWORK_ERROR = "NETWORK_ERROR";
    private static final String EC_SIGNATURE_ERROR = "SIGNATURE_ERROR";
    private static final String EC_INVALID_ACTIVATION_STATE = "INVALID_ACTIVATION_STATE";
    private static final String EC_INVALID_ACTIVATION_DATA = "INVALID_ACTIVATION_DATA";
    private static final String EC_MISSING_ACTIVATION = "MISSING_ACTIVATION";
    private static final String EC_PENDING_ACTIVATION = "PENDING_ACTIVATION";
    private static final String EC_BIOMETRY_CANCEL = "BIOMETRY_CANCEL";
    private static final String EC_OPERATION_CANCELED = "OPERATION_CANCELED";
    private static final String EC_INVALID_ACTIVATION_CODE = "INVALID_ACTIVATION_CODE";
    private static final String EC_INVALID_TOKEN = "INVALID_TOKEN";
    private static final String EC_ENCRYPTION_ERROR = "ENCRYPTION_ERROR";
    private static final String EC_WRONG_PARAMETER = "WRONG_PARAMETER";
    private static final String EC_PROTOCOL_UPGRADE = "PROTOCOL_UPGRADE";
    private static final String EC_PENDING_PROTOCOL_UPGRADE = "PENDING_PROTOCOL_UPGRADE";
    private static final String EC_BIOMETRY_NOT_SUPPORTED = "BIOMETRY_NOT_SUPPORTED";
    private static final String EC_BIOMETRY_NOT_AVAILABLE = "BIOMETRY_NOT_AVAILABLE";
    private static final String EC_BIOMETRY_NOT_RECOGNIZED = "BIOMETRY_NOT_RECOGNIZED";
    private static final String EC_INSUFFICIENT_KEYCHAIN_PROTECTION = "INSUFFICIENT_KEYCHAIN_PROTECTION";
    private static final String EC_BIOMETRY_LOCKOUT = "BIOMETRY_LOCKOUT";
}