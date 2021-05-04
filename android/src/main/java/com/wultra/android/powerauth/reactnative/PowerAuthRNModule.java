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
import io.getlime.security.powerauth.util.otp.Otp;
import io.getlime.security.powerauth.util.otp.OtpUtil;

@SuppressWarnings("unused")
public class PowerAuthRNModule extends ReactContextBaseJavaModule {

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
    public void isConfigured(@Nonnull String instanceId, Promise promise) {
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
    public void configure(String instanceId, String appKey, String appSecret, String masterServerPublicKey, String baseEndpointUrl, boolean enableUnsecureTraffic, Promise promise) {
        PowerAuthConfiguration paConfig = new PowerAuthConfiguration.Builder(
                instanceId,
                baseEndpointUrl,
                appKey,
                appSecret,
                masterServerPublicKey
        ).build();

        PowerAuthClientConfiguration.Builder paClientConfigBuilder = new PowerAuthClientConfiguration.Builder();

        if (enableUnsecureTraffic) {
            paClientConfigBuilder.clientValidationStrategy(new PA2ClientSslNoValidationStrategy());
            paClientConfigBuilder.allowUnsecuredConnection(true);
        }
        try {
            configure(instanceId, new PowerAuthSDK.Builder(paConfig).clientConfiguration(paClientConfigBuilder.build()));
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PA2ReactNativeError", "Failed to configure");
        }
    }
    
    @ReactMethod
    public void deconfigure(String instanceId, Promise promise) {
        this.instances.remove(instanceId);
        promise.resolve(null);
    }

    @ReactMethod
    public void hasValidActivation(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).hasValidActivation());
    }

    @ReactMethod
    public void canStartActivation(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).canStartActivation());
    }

    @ReactMethod
    public void hasPendingActivation(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).hasPendingActivation());
    }

    @ReactMethod
    public void activationIdentifier(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).getActivationIdentifier());
    }

    @ReactMethod
    public  void activationFingerprint(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).getActivationFingerprint());
    }

    @ReactMethod
    public void fetchActivationStatus(String instanceId, final Promise promise) {

        this.powerAuth(instanceId).fetchActivationStatusWithCallback(this.context, new IActivationStatusListener() {
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

    @ReactMethod
    public void createActivation(String instanceId, ReadableMap activation, final Promise promise) {

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
                promise.reject("PA2RNInvalidActivationObject", "Activation object is invalid.");
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

            this.powerAuth(instanceId).createActivation(paActivation.build(), new ICreateActivationListener() {
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

    @ReactMethod
    public void commitActivation(String instanceId, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        if (auth.usePassword == null) {
            promise.reject("PA2ReactNativeErrorPasswordNotSet", "Password is not set.");
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
            this.powerAuth(instanceId).commitActivation(this.context, ((FragmentActivity) getCurrentActivity()).getSupportFragmentManager(), title, message, auth.usePassword, new ICommitActivationWithBiometryListener() {

                @Override
                public void onBiometricDialogCancelled() {
                    promise.reject("PA2ReactNativeError_BiometryCanceled", "Biometry dialog was canceled");
                }

                @Override
                public void onBiometricDialogSuccess() {
                    promise.resolve(null);
                }

                @Override
                public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                    promise.reject("PA2ReactNativeError_BiometryFailed", "Biometry dialog failed");
                }
            });
        } else {
            int result = this.powerAuth(instanceId).commitActivationWithPassword(this.context, auth.usePassword);
            if (result == PowerAuthErrorCodes.PA2Succeed) {
                promise.resolve(null);
            } else {
                promise.reject(PowerAuthRNModule.getErrorCodeFromError(result), "Commit failed.");
            }
        }
    }

    @ReactMethod
    public void removeActivationWithAuthentication(String instanceId, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).removeActivationWithAuthentication(this.context, auth, new IActivationRemoveListener() {
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

    @ReactMethod
    public void removeActivationLocal(String instanceId, Promise promise) {
        try {
            this.powerAuth(instanceId).removeActivationLocal(this.context);
            promise.resolve(null);
        } catch (Throwable t) {
            PowerAuthRNModule.rejectPromise(promise, t);
        }
    }

    @ReactMethod
    public void requestGetSignature(String instanceId, ReadableMap authMap, String uriId, @Nullable ReadableMap params, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        Map<String, String> paramMap = params == null ? null : PowerAuthRNModule.getStringMap(params);
        PowerAuthAuthorizationHttpHeader header = this.powerAuth(instanceId).requestGetSignatureWithAuthentication(this.context, auth, uriId, paramMap);
        ReadableMap headerObject = PowerAuthRNModule.getHttpHeaderObject(header);

        if (headerObject != null) {
            promise.resolve(headerObject);
        } else {
            promise.reject(PowerAuthRNModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
        }
    }

    @ReactMethod
    public void requestSignature(String instanceId, ReadableMap authMap, String method, String uriId, @Nullable String body, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
        PowerAuthAuthorizationHttpHeader header = this.powerAuth(instanceId).requestSignatureWithAuthentication(this.context, auth, method, uriId, decodedBody);
        if (header.powerAuthErrorCode == PowerAuthErrorCodes.PA2Succeed) {
            WritableMap returnMap = Arguments.createMap();
            returnMap.putString("key", header.key);
            returnMap.putString("value", header.value);
            promise.resolve(returnMap);
        } else {
            promise.reject(PowerAuthRNModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
        }
    }

    @ReactMethod
    public void offlineSignature(String instanceId, ReadableMap authMap, String uriId, @Nullable String body, String nonce, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        byte[] decodedBody = body == null ? null : body.getBytes(StandardCharsets.UTF_8);
        String signature = this.powerAuth(instanceId).offlineSignatureWithAuthentication(this.context, auth, uriId, decodedBody, nonce);
        if (signature != null) {
            promise.resolve(signature);
        } else {
            promise.reject("PA2ReactNativeError", "Signature failed");
        }
    }

    @ReactMethod
    public void verifyServerSignedData(String instanceId, String data, String signature, boolean masterKey, Promise promise) {
        try {
            byte[] decodedData = data.getBytes(StandardCharsets.UTF_8);
            byte[] decodedSignature = Base64.decode(signature, Base64.DEFAULT);
            promise.resolve(this.powerAuth(instanceId).verifyServerSignedData(decodedData, decodedSignature, masterKey));
        } catch (Exception e) {
            promise.reject("PA2ReactNativeError", "Verify failed");
        }
    }

    @ReactMethod
    public void unsafeChangePassword(String instanceId, String oldPassword, String newPassword, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).changePasswordUnsafe(oldPassword, newPassword));
    }

    @ReactMethod
    public void changePassword(String instanceId, String oldPassword, String newPassword, final Promise promise) {
        this.powerAuth(instanceId).changePassword(this.context, oldPassword, newPassword, new IChangePasswordListener() {
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

    @ReactMethod
    public void addBiometryFactor(String instanceId, String password, String title, String description, final Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                this.powerAuth(instanceId).addBiometryFactor(
                        this.context,
                        ((FragmentActivity)getCurrentActivity()).getSupportFragmentManager(),
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
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void hasBiometryFactor(String instanceId, Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(this.powerAuth(instanceId).hasBiometryFactor(this.context));
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void removeBiometryFactor(String instanceId, Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(this.powerAuth(instanceId).removeBiometryFactor(this.context));
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void getBiometryInfo(String instanceId, Promise promise) {
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
    public void fetchEncryptionKey(String instanceId, ReadableMap authMap, int index, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).fetchEncryptionKey(this.context, auth, index, new IFetchEncryptionKeyListener() {
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

    @ReactMethod
    public void signDataWithDevicePrivateKey(String instanceId, ReadableMap authMap, String data, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).signDataWithDevicePrivateKey(this.context, auth, data.getBytes(StandardCharsets.UTF_8), new IDataSignatureListener() {
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

    @ReactMethod
    public void validatePassword(String instanceId, String password, final Promise promise) {
        this.powerAuth(instanceId).validatePasswordCorrect(this.context, password, new IValidatePasswordListener() {
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

    @ReactMethod
    public void hasActivationRecoveryData(String instanceId, Promise promise) {
        promise.resolve(this.powerAuth(instanceId).hasActivationRecoveryData());
    }

    @ReactMethod
    public void activationRecoveryData(String instanceId, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).getActivationRecoveryData(this.context, auth, new IGetRecoveryDataListener() {
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

    @ReactMethod
    public void confirmRecoveryCode(String instanceId, String recoveryCode, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).confirmRecoveryCode(this.context, auth, recoveryCode, new IConfirmRecoveryCodeListener() {
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

    @ReactMethod
    public void authenticateWithBiometry(String instanceId, String title, String description, final Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                this.powerAuth(instanceId).authenticateUsingBiometry(
                        this.context,
                        ((FragmentActivity) getCurrentActivity()).getSupportFragmentManager(),
                        title,
                        description,
                        new IBiometricAuthenticationCallback() {
                            @Override
                            public void onBiometricDialogCancelled(boolean userCancel) {
                                promise.reject("PA2ReactNativeError_BiometryCanceled", "Biometry dialog was canceled");
                            }

                            @Override
                            public void onBiometricDialogSuccess(@NonNull BiometricKeyData biometricKeyData) {
                                String base64 = new String(Base64.encode(biometricKeyData.getDerivedData(), Base64.DEFAULT));
                                promise.resolve(base64);
                            }

                            @Override
                            public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                promise.reject("PA2ReactNativeError_BiometryFailed", "Biometry dialog failed");
                            }
                        }
                );
            } catch (Exception e) {
                PowerAuthRNModule.rejectPromise(promise, e);
            }
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    /** TOKEN BASED AUTHENTICATION  */

    @ReactMethod
    public void requestAccessToken(String instanceId, String tokenName, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthRNModule.constructAuthentication(authMap);
        this.powerAuth(instanceId).getTokenStore().requestAccessToken(this.context, tokenName, auth, new IGetTokenListener() {
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

    @ReactMethod
    public void removeAccessToken(String instanceId, String tokenName, final Promise promise) {
        this.powerAuth(instanceId).getTokenStore().removeAccessToken(this.context, tokenName, new IRemoveTokenListener() {
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

    @ReactMethod
    public void getLocalToken(String instanceId, String tokenName, final Promise promise) {
        PowerAuthToken token = this.powerAuth(instanceId).getTokenStore().getLocalToken(this.context, tokenName);
        if (token != null) {
            WritableMap response = Arguments.createMap();
            response.putBoolean("isValid", token.isValid());
            response.putBoolean("canGenerateHeader", token.canGenerateHeader());
            response.putString("tokenName", token.getTokenName());
            response.putString("tokenIdentifier", token.getTokenIdentifier());
            promise.resolve(response);
        } else {
            promise.reject("PA2RNLocalTokenNotAvailable", "Token with this name is not in the local store.");
        }
    }

    @ReactMethod
    public void hasLocalToken(String instanceId, String tokenName, final Promise promise) {
        promise.resolve(this.powerAuth(instanceId).getTokenStore().hasLocalToken(this.context, tokenName));
    }

    @ReactMethod
    public void removeLocalToken(String instanceId, String tokenName, final Promise promise) {
        this.powerAuth(instanceId).getTokenStore().removeLocalToken(this.context, tokenName);
        promise.resolve(null);
    }

    @ReactMethod
    public void removeAllLocalTokens(String instanceId, final Promise promise) {
        this.powerAuth(instanceId).getTokenStore().removeAllLocalTokens(this.context);
        promise.resolve(null);
    }

    @ReactMethod
    public void generateHeaderForToken(String instanceId, String tokenName, final Promise promise) {
        PowerAuthToken token = this.powerAuth(instanceId).getTokenStore().getLocalToken(this.context, tokenName);
        if (token == null) {
            promise.reject("PA2RNTokenNotAvailable", "This token is no longer available in the local store.");
        }
        else if (token.canGenerateHeader()) {
            promise.resolve(PowerAuthRNModule.getHttpHeaderObject(token.generateHeader()));
        } else {
            promise.reject("PA2RNCannotGenerateHeader", "Cannot generate header for this token.");
        }
    }

    /** OTP UTIL METHODS */

    @ReactMethod
    public void parseActivationCode(String activationCode, Promise promise) {
        Otp otp = OtpUtil.parseFromActivationCode(activationCode);
        if (otp != null) {
            WritableMap response = Arguments.createMap();
            response.putString("activationCode", otp.activationCode);
            response.putString("activationSignature", otp.activationSignature);
            promise.resolve(response);
        } else {
            promise.reject("PA2RNInvalidActivationCode", "Invalid activation code.");
        }
    }

    @ReactMethod
    public void validateActivationCode(String activationCode, Promise promise) {
        promise.resolve(OtpUtil.validateActivationCode(activationCode));
    }

    @ReactMethod
    public void parseRecoveryCode(String recoveryCode, Promise promise) {
        Otp otp = OtpUtil.parseFromRecoveryCode(recoveryCode);
        if (otp != null) {
            WritableMap response = Arguments.createMap();
            response.putString("activationCode", otp.activationCode);
            response.putString("activationSignature", otp.activationSignature);
            promise.resolve(response);
        } else {
            promise.reject("PA2RNInvalidRecoveryCode", "Invalid recovery code.");
        }
    }

    @ReactMethod
    public void validateRecoveryCode(String recoveryCode, Promise promise) {
        promise.resolve(OtpUtil.validateRecoveryCode(recoveryCode));
    }

    @ReactMethod
    public void validateRecoveryPuk(String puk, Promise promise) {
        promise.resolve(OtpUtil.validateRecoveryPuk(puk));
    }

    @ReactMethod
    public void validateTypedCharacter(int character, Promise promise) {
        promise.resolve(OtpUtil.validateTypedCharacter(character));
    }

    @ReactMethod
    public void correctTypedCharacter(int character, Promise promise) {
        int corrected = OtpUtil.validateAndCorrectTypedCharacter(character);
        if (corrected == 0) {
            promise.reject("PA2RNInvalidCharacter", "Invalid character cannot be corrected.");
        } else {
            promise.resolve(corrected);
        }
    }

    /** HELPER METHODS */

    private PowerAuthSDK powerAuth(@Nonnull String instanceId) {
        if (!this.instances.containsKey(instanceId)) {
            throw new IllegalStateException("This PowerAuth instance is not configured.");
        }
        return this.instances.get(instanceId);
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
        if (header.powerAuthErrorCode == PowerAuthErrorCodes.PA2Succeed) {
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
            case ActivationStatus.State_Created: return "PA2ActivationState_Created";
            case ActivationStatus.State_Pending_Commit: return "PA2ActivationState_PendingCommit";
            case ActivationStatus.State_Active: return "PA2ActivationState_Active";
            case ActivationStatus.State_Blocked: return "PA2ActivationState_Blocked";
            case ActivationStatus.State_Removed: return "PA2ActivationState_Removed";
            case ActivationStatus.State_Deadlock: return "PA2ActivationState_Deadlock";
            default: return String.format("PA2ActivationState_Unknown%d", state);
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

        @Nonnull String code = "PA2ReactNativeError"; // fallback code
        String message = t.getMessage();
        WritableMap userInfo = null;

        if (t instanceof PowerAuthErrorException) {
            code = getErrorCodeFromError(((PowerAuthErrorException)t).getPowerAuthErrorCode());
        } else if (t instanceof FailedApiException) {
            FailedApiException farEx = (FailedApiException)t;
            code = "PA2ErrorResponseException";
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
            case PowerAuthErrorCodes.PA2Succeed: return "PA2Succeed";
            case PowerAuthErrorCodes.PA2ErrorCodeNetworkError: return "PA2ErrorCodeNetworkError";
            case PowerAuthErrorCodes.PA2ErrorCodeSignatureError: return "PA2ErrorCodeSignatureError";
            case PowerAuthErrorCodes.PA2ErrorCodeInvalidActivationState: return "PA2ErrorCodeInvalidActivationState";
            case PowerAuthErrorCodes.PA2ErrorCodeInvalidActivationData: return "PA2ErrorCodeInvalidActivationData";
            case PowerAuthErrorCodes.PA2ErrorCodeMissingActivation: return "PA2ErrorCodeMissingActivation";
            case PowerAuthErrorCodes.PA2ErrorCodeActivationPending: return "PA2ErrorCodeActivationPending";
            case PowerAuthErrorCodes.PA2ErrorCodeBiometryCancel: return "PA2ErrorCodeBiometryCancel";
            case PowerAuthErrorCodes.PA2ErrorCodeOperationCancelled: return "PA2ErrorCodeOperationCancelled";
            case PowerAuthErrorCodes.PA2ErrorCodeInvalidActivationCode: return "PA2ErrorCodeInvalidActivationCode";
            case PowerAuthErrorCodes.PA2ErrorCodeInvalidToken: return "PA2ErrorCodeInvalidToken";
            case PowerAuthErrorCodes.PA2ErrorCodeEncryptionError: return "PA2ErrorCodeEncryption"; // different string to be consistent with iOS where this case is named differently
            case PowerAuthErrorCodes.PA2ErrorCodeWrongParameter: return "PA2ErrorCodeWrongParameter";
            case PowerAuthErrorCodes.PA2ErrorCodeProtocolUpgrade: return "PA2ErrorCodeProtocolUpgrade";
            case PowerAuthErrorCodes.PA2ErrorCodePendingProtocolUpgrade: return "PA2ErrorCodePendingProtocolUpgrade";
            case PowerAuthErrorCodes.PA2ErrorCodeBiometryNotSupported: return "PA2ErrorCodeBiometryNotSupported";
            case PowerAuthErrorCodes.PA2ErrorCodeBiometryNotAvailable: return "PA2ErrorCodeBiometryNotAvailable";
            case PowerAuthErrorCodes.PA2ErrorCodeBiometryNotRecognized: return "PA2ErrorCodeBiometryNotRecognized";
            default: return String.format("PA2UnknownCode%d", error);
        }
    }
}