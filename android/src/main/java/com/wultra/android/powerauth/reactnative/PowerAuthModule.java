package com.wultra.android.powerauth.reactnative;

import android.os.Build;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Base64;

import android.support.v4.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import java.lang.*;
import java.util.HashMap;
import java.util.Map;

import io.getlime.security.powerauth.biometry.IBiometricAuthenticationCallback;
import io.getlime.security.powerauth.sdk.*;
import io.getlime.security.powerauth.networking.ssl.*;
import io.getlime.security.powerauth.networking.response.*;
import io.getlime.security.powerauth.core.*;
import io.getlime.security.powerauth.exception.*;

@SuppressWarnings("unused")
public class PowerAuthModule extends ReactContextBaseJavaModule {

    private ReactApplicationContext context;
    private PowerAuthSDK powerAuth;

    public PowerAuthModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @Override
    public String getName() {
        return "PowerAuth";
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
        
        this.powerAuth = new PowerAuthSDK.Builder(paConfig).clientConfiguration(paClientConfigBuilder.build()).build(this.context);

        promise.resolve(true);
    }

    @ReactMethod
    public void hasValidActivation(Promise promise) {
        promise.resolve(this.powerAuth.hasValidActivation());
    }

    @ReactMethod
    public void canStartActivation(Promise promise) {
        promise.resolve(this.powerAuth.canStartActivation());
    }

    @ReactMethod
    public void hasPendingActivation(Promise promise) {
        promise.resolve(this.powerAuth.hasPendingActivation());
    }

    @ReactMethod
    public void activationIdentifier(Promise promise) {
        promise.resolve(this.powerAuth.getActivationIdentifier());
    }

    @ReactMethod
    public  void activationFingerprint(Promise promise) {
        promise.resolve(this.powerAuth.getActivationFingerprint());
    }

    @ReactMethod
    public void fetchActivationStatus(final Promise promise) {

        this.powerAuth.fetchActivationStatusWithCallback(this.context, new IActivationStatusListener() {
            @Override
            public void onActivationStatusSucceed(ActivationStatus status) {
                WritableMap map = Arguments.createMap();
                map.putString("state", PowerAuthModule.getStatusCode(status.state));
                map.putInt("failCount", status.failCount);
                map.putInt("maxFailCount", status.maxFailCount);
                map.putInt("remainingAttempts", status.getRemainingAttempts());
                promise.resolve(map);
            }
      
            @Override
            public void onActivationStatusFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
          });
    }

    @ReactMethod
    public void createActivation(ReadableMap activation, final Promise promise) {

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
                paActivation = PowerAuthActivation.Builder.customActivation(PowerAuthModule.getStringMap(identityAttributes), name);
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

            this.powerAuth.createActivation(paActivation.build(), new ICreateActivationListener() {
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
                    }
                    promise.resolve(map);
                }

                @Override
                public void onActivationCreateFailed(@NonNull Throwable t) {
                    promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
                }
            });
        } catch (Exception e) {
            promise.reject(PowerAuthModule.getErrorCodeFromThrowable(e) ,e);
        }
    }

    @ReactMethod
    public void commitActivation(ReadableMap authMap, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        int result = this.powerAuth.commitActivationWithAuthentication(this.context, auth);
        if (result == PowerAuthErrorCodes.PA2Succeed) {
            promise.resolve(null);
        } else {
            promise.reject(PowerAuthModule.getErrorCodeFromError(result), "Commit failed.");
        }
    }

    @ReactMethod
    public void removeActivationWithAuthentication(ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        this.powerAuth.removeActivationWithAuthentication(this.context, auth, new IActivationRemoveListener() {
            @Override
            public void onActivationRemoveSucceed() {
                promise.resolve(null);
            }

            @Override
            public void onActivationRemoveFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void removeActivationLocal() {
        this.powerAuth.removeActivationLocal(this.context);
    }

    @ReactMethod
    public void requestGetSignature(ReadableMap authMap, String uriId, @Nullable ReadableMap params, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        Map<String, String> paramMap = params == null ? null : PowerAuthModule.getStringMap(params);
        PowerAuthAuthorizationHttpHeader header = this.powerAuth.requestGetSignatureWithAuthentication(this.context, auth, uriId, paramMap);

        if (header.powerAuthErrorCode == PowerAuthErrorCodes.PA2Succeed) {
            WritableMap returnMap = Arguments.createMap();
            returnMap.putString("key", header.key);
            returnMap.putString("value", header.value);
            promise.resolve(returnMap);
        } else {
            promise.reject(PowerAuthModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
        }
    }

    @ReactMethod
    public void requestSignature(ReadableMap authMap, String method, String uriId, @Nullable String body, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        byte[] decodedBody = body == null ? null : Base64.decode(body, Base64.DEFAULT);
        PowerAuthAuthorizationHttpHeader header = this.powerAuth.requestSignatureWithAuthentication(this.context, auth, method, uriId, decodedBody);
        if (header.powerAuthErrorCode == PowerAuthErrorCodes.PA2Succeed) {
            WritableMap returnMap = Arguments.createMap();
            returnMap.putString("key", header.key);
            returnMap.putString("value", header.value);
            promise.resolve(returnMap);
        } else {
            promise.reject(PowerAuthModule.getErrorCodeFromError(header.powerAuthErrorCode), "Signature failed.");
        }
    }

    @ReactMethod
    public void offlineSignature(ReadableMap authMap, String uriId, @Nullable String body, String nonce, Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        byte[] decodedBody = body == null ? null : Base64.decode(body, Base64.DEFAULT);
        String signature = this.powerAuth.offlineSignatureWithAuthentication(this.context, auth, uriId, decodedBody, nonce);
        if (signature != null) {
            promise.resolve(signature);
        } else {
            promise.reject("PA2ReactNativeError", "Signature failed");
        }
    }

    @ReactMethod
    public void verifyServerSignedData(String data, String signature, boolean masterKey, Promise promise) {
        try {
            byte[] decodedData = Base64.decode(data, Base64.DEFAULT);
            byte[] decodedSignature = Base64.decode(signature, Base64.DEFAULT);
            promise.resolve(this.powerAuth.verifyServerSignedData(decodedData, decodedSignature, masterKey));
        } catch (Exception e) {
            promise.reject("PA2ReactNativeError", "Verify failed");
        }
    }

    @ReactMethod
    public void unsafeChangePassword(String oldPassword, String newPassword, Promise promise) {
        promise.resolve(this.powerAuth.changePasswordUnsafe(oldPassword, newPassword));
    }

    @ReactMethod
    public void changePassword(String oldPassword, String newPassword, final Promise promise) {
        this.powerAuth.changePassword(this.context, oldPassword, newPassword, new IChangePasswordListener() {
            @Override
            public void onPasswordChangeSucceed() {
                promise.resolve(null);
            }

            @Override
            public void onPasswordChangeFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void addBiometryFactor(String password, String title, String description, final Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                this.powerAuth.addBiometryFactor(
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
                            public void onAddBiometryFactorFailed(Throwable t) {
                                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t), t);
                            }
                        });
            } catch (Exception e) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(e) ,e);
            }
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void hasBiometryFactor(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(this.powerAuth.hasBiometryFactor(this.context));
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void removeBiometryFactor(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(this.powerAuth.removeBiometryFactor(this.context));
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    @ReactMethod
    public void fetchEncryptionKey(ReadableMap authMap, int index, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        this.powerAuth.fetchEncryptionKey(this.context, auth, index, new IFetchEncryptionKeyListener() {
            @Override
            public void onFetchEncryptionKeySucceed(byte[] encryptedEncryptionKey) {
                promise.resolve(Base64.encodeToString(encryptedEncryptionKey, Base64.DEFAULT));
            }

            @Override
            public void onFetchEncryptionKeyFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void validatePassword(String password, final Promise promise) {
        this.powerAuth.validatePasswordCorrect(this.context, password, new IValidatePasswordListener() {
            @Override
            public void onPasswordValid() {
                promise.resolve(null);
            }

            @Override
            public void onPasswordValidationFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void hasActivationRecoveryData(Promise promise) {
        promise.resolve(this.powerAuth.hasActivationRecoveryData());
    }

    @ReactMethod
    public void activationRecoveryData(ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        this.powerAuth.getActivationRecoveryData(this.context, auth, new IGetRecoveryDataListener() {
            @Override
            public void onGetRecoveryDataSucceeded(@NonNull RecoveryData recoveryData) {
                WritableMap map = Arguments.createMap();
                map.putString("recoveryCode", recoveryData.recoveryCode);
                map.putString("puk", recoveryData.puk);
                promise.resolve(map);
            }

            @Override
            public void onGetRecoveryDataFailed(@NonNull Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void confirmRecoveryCode(String recoveryCode, ReadableMap authMap, final Promise promise) {
        PowerAuthAuthentication auth = PowerAuthModule.constructAuthentication(authMap);
        this.powerAuth.confirmRecoveryCode(this.context, auth, recoveryCode, new IConfirmRecoveryCodeListener() {
            @Override
            public void onRecoveryCodeConfirmed(boolean alreadyConfirmed) {
                promise.resolve(null);
            }

            @Override
            public void onRecoveryCodeConfirmFailed(@NonNull Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
        });
    }

    @ReactMethod
    public void authenticateWithBiometry(String title, String description, final Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                this.powerAuth.authenticateUsingBiometry(
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
                            public void onBiometricDialogSuccess(@NonNull byte[] biometricKeyEncrypted) {
                                String base64 = new String(Base64.encode(biometricKeyEncrypted, Base64.DEFAULT));
                                promise.resolve(base64);
                            }

                            @Override
                            public void onBiometricDialogFailed(@NonNull PowerAuthErrorException error) {
                                promise.reject("PA2ReactNativeError_BiometryFailed", "Biometry dialog failed");
                            }
                        }
                );
            } catch (Exception e) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(e) ,e);
            }
        } else {
            promise.reject("PA2ReactNativeError", "Biometry not supported on this android version.");
        }
    }

    static Map<String, String> getStringMap(ReadableMap rm) {
        Map<String, String> map = new HashMap<>();
        for (Map.Entry<String, Object> entry : rm.toHashMap().entrySet()) {
            if (entry.getValue() instanceof String) {
                map.put(entry.getKey(), (String)entry.getValue());
            }
        }
        return map;
    }

    static String getStatusCode(int state) {
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

    static PowerAuthAuthentication constructAuthentication(ReadableMap map) {
        PowerAuthAuthentication auth = new PowerAuthAuthentication();
        auth.usePossession = map.getBoolean("usePossession");
        String biometryKey = map.getString("biometryKey");
        if (biometryKey != null) {
            byte[] key = Base64.decode(biometryKey, Base64.DEFAULT);
            auth.useBiometry = key;
        }
        auth.usePassword = map.getString("userPassword");
        return auth;
    }

    static String getErrorCodeFromThrowable(Throwable t) {

        PowerAuthErrorException paEx = (t instanceof PowerAuthErrorException ? (PowerAuthErrorException)t : null);
        if (paEx == null) {
            return "PA2ReactNativeError";
        }

        return getErrorCodeFromError(paEx.getPowerAuthErrorCode());
    }

    static String getErrorCodeFromError(int error) {
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