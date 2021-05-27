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
import io.getlime.security.powerauth.networking.exceptions.FailedApiException;
import io.getlime.security.powerauth.sdk.*;
import io.getlime.security.powerauth.networking.ssl.*;
import io.getlime.security.powerauth.networking.response.*;
import io.getlime.security.powerauth.core.*;
import io.getlime.security.powerauth.exception.*;

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

    void configure(@Nonnull String instanceId, @NonNull PowerAuthSDK.Builder builder) throws IllegalStateException, IllegalArgumentException {
        if (this.instances.containsKey(instanceId)) {
            throw new IllegalStateException("PowerAuth object with this instanceId is already configured.");
        }

        try {
            PowerAuthSDK powerAuth = builder.build(this.context);
            this.instances.put(instanceId, powerAuth);
        } catch (PowerAuthErrorException e) {
            throw new IllegalArgumentException("Unable to configure with provided data", e);
        }
    }

    @ReactMethod
    public void configure(String instanceId, String appKey, String appSecret, String masterServerPublicKey, String baseEndpointUrl, boolean enableUnsecureTraffic, final Promise promise) {
        PowerAuthConfiguration paConfig = new PowerAuthConfiguration.Builder(
                instanceId,
                baseEndpointUrl,
                appKey,
                appSecret,
                masterServerPublicKey
        ).build();

        PowerAuthClientConfiguration.Builder paClientConfigBuilder = new PowerAuthClientConfiguration.Builder();

        if (enableUnsecureTraffic) {
            paClientConfigBuilder.clientValidationStrategy(new HttpClientSslNoValidationStrategy());
            paClientConfigBuilder.allowUnsecuredConnection(true);
        }
        try {
            configure(instanceId, new PowerAuthSDK.Builder(paConfig).clientConfiguration(paClientConfigBuilder.build()));
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("REACT_NATIVE_ERROR", "Failed to configure");
        }
    }
    
    @ReactMethod
    public void deconfigure(String instanceId, final Promise promise) {
        this.instances.remove(instanceId);
        promise.resolve(null);
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
                        promise.reject("INVALID_ACTIVATION_OBJECT", "Activation object is invalid.");
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
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
                if (auth.usePassword == null) {
                    promise.reject("PASSWORD_NOT_SET", "Password is not set.");
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
                        sdk.commitActivation(context, (FragmentActivity) getCurrentActivity(), title, message, auth.usePassword, new ICommitActivationWithBiometryListener() {

                            @Override
                            public void onBiometricDialogCancelled() {
                                promise.reject("BIOMETRY_CANCEL", "Biometry dialog was canceled");
                            }

                            @Override
                            public void onBiometricDialogSuccess() {
                                promise.resolve(null);
                            }

                            @Override
                            public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                promise.reject("BIOMETRY_FAILED", "Biometry dialog failed");
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
                    promise.reject("REACT_NATIVE_ERROR", "Signature failed");
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
                    promise.reject("REACT_NATIVE_ERROR", "Verify failed");
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
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
            @Override
            public void run(PowerAuthSDK sdk) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        sdk.addBiometryFactor(
                                context,
                                (FragmentActivity)getCurrentActivity(),
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
                    promise.reject("REACT_NATIVE_ERROR", "Biometry not supported on this android version.");
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
                    promise.reject("REACT_NATIVE_ERROR", "Biometry not supported on this android version.");
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
                    promise.reject("REACT_NATIVE_ERROR", "Biometry not supported on this android version.");
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
        this.usePowerAuth(instanceId, promise, new PowerAuthBlock() {
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
                                    promise.reject("BIOMETRY_CANCEL", "Biometry dialog was canceled");
                                }

                                @Override
                                public void onBiometricDialogSuccess(@NonNull BiometricKeyData biometricKeyData) {
                                    String base64 = new String(Base64.encode(biometricKeyData.getDerivedData(), Base64.DEFAULT));
                                    promise.resolve(base64);
                                }

                                @Override
                                public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                    promise.reject("BIOMETRY_FAILED", "Biometry dialog failed");
                                }
                            }
                        );
                    } catch (Exception e) {
                        PowerAuthRNModule.rejectPromise(promise, e);
                    }
                } else {
                    promise.reject("REACT_NATIVE_ERROR", "Biometry not supported on this android version.");
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
                    promise.reject("LOCAL_TOKEN_NOT_AVAILABLE", "Token with this name is not in the local store.");
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
                    promise.reject("LOCAL_TOKEN_ONT_AVAILABLE", "This token is no longer available in the local store.");
                }
                else if (token.canGenerateHeader()) {
                    promise.resolve(PowerAuthRNModule.getHttpHeaderObject(token.generateHeader()));
                } else {
                    promise.reject("CANNOT_GENERATE_TOKEN", "Cannot generate header for this token.");
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
            promise.reject("INVALID_ACTIVATION_CODE", "Invalid activation code.");
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
            promise.reject("INVALID_RECOVERY_CODE", "Invalid recovery code.");
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
            promise.reject("INVALID_CHARACTER", "Invalid character cannot be corrected.");
        } else {
            promise.resolve(corrected);
        }
    }

    /** HELPER METHODS */

    private void usePowerAuth(@Nonnull String instanceId, final Promise promise, PowerAuthBlock block) {
        if (!this.instances.containsKey(instanceId)) {
            promise.reject("INSTANCE_NOT_CONFIGURED", "This instance is not configured.");
            return;
        }
        block.run(this.instances.get(instanceId));
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

        @Nonnull String code = "REACT_NATIVE_ERROR"; // fallback code
        String message = t.getMessage();
        WritableMap userInfo = null;

        if (t instanceof PowerAuthErrorException) {
            code = getErrorCodeFromError(((PowerAuthErrorException)t).getPowerAuthErrorCode());
        } else if (t instanceof FailedApiException) {
            FailedApiException farEx = (FailedApiException)t;
            code = "RESPONSE_ERROR";
            userInfo = Arguments.createMap();
            userInfo.putInt("responseCode", farEx.getResponseCode());
            userInfo.putString("responseBody", farEx.getResponseBody());
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
            case PowerAuthErrorCodes.SUCCEED: return "SUCCEED";
            case PowerAuthErrorCodes.NETWORK_ERROR: return "NETWORK_ERROR";
            case PowerAuthErrorCodes.SIGNATURE_ERROR: return "SIGNATURE_ERROR";
            case PowerAuthErrorCodes.INVALID_ACTIVATION_STATE: return "INVALID_ACTIVATION_STATE";
            case PowerAuthErrorCodes.INVALID_ACTIVATION_DATA: return "INVALID_ACTIVATION_DATA";
            case PowerAuthErrorCodes.MISSING_ACTIVATION: return "MISSING_ACTIVATION";
            case PowerAuthErrorCodes.PENDING_ACTIVATION: return "PENDING_ACTIVATION";
            case PowerAuthErrorCodes.BIOMETRY_CANCEL: return "BIOMETRY_CANCEL";
            case PowerAuthErrorCodes.OPERATION_CANCELED: return "OPERATION_CANCELED";
            case PowerAuthErrorCodes.INVALID_ACTIVATION_CODE: return "INVALID_ACTIVATION_CODE";
            case PowerAuthErrorCodes.INVALID_TOKEN: return "INVALID_TOKEN";
            case PowerAuthErrorCodes.ENCRYPTION_ERROR: return "ENCRYPTION_ERROR";
            case PowerAuthErrorCodes.WRONG_PARAMETER: return "WRONG_PARAMETER";
            case PowerAuthErrorCodes.PROTOCOL_UPGRADE: return "PROTOCOL_UPGRADE";
            case PowerAuthErrorCodes.PENDING_PROTOCOL_UPGRADE: return "PENDING_PROTOCOL_UPGRADE";
            case PowerAuthErrorCodes.BIOMETRY_NOT_SUPPORTED: return "BIOMETRY_NOT_SUPPORTED";
            case PowerAuthErrorCodes.BIOMETRY_NOT_AVAILABLE: return "BIOMETRY_NOT_AVAILABLE";
            case PowerAuthErrorCodes.BIOMETRY_NOT_RECOGNIZED: return "BIOMETRY_NOT_RECOGNIZED";
            case PowerAuthErrorCodes.INSUFFICIENT_KEYCHAIN_PROTECTION: return "INSUFFICIENT_KEYCHAIN_PROTECTION";
            case PowerAuthErrorCodes.BIOMETRY_LOCKOUT: return "BIOMETRY_LOCKOUT";
            default: return String.format("UNKNOWN_%d", error);
        }
    }
}