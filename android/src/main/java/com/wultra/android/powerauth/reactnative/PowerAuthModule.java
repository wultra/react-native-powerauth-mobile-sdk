package com.wultra.android.powerauth.reactnative;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import java.lang.*;

import io.getlime.security.powerauth.sdk.*;
import io.getlime.security.powerauth.networking.ssl.*;
import io.getlime.security.powerauth.networking.response.*;
import io.getlime.security.powerauth.core.*;
import io.getlime.security.powerauth.exception.*;

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
    public void configure(String instanceId, String appKey, String appSecret, String masterServerPublicKey, String baseEndpointUrl, Promise promise) {

        PowerAuthConfiguration paConfig = new PowerAuthConfiguration.Builder(
            instanceId,
            baseEndpointUrl,
            appKey,
            appSecret,
            masterServerPublicKey
        ).build();

        PowerAuthClientConfiguration.Builder paClientConfigBuilder = new PowerAuthClientConfiguration.Builder();

        paClientConfigBuilder.clientValidationStrategy(new PA2ClientSslNoValidationStrategy());
        paClientConfigBuilder.allowUnsecuredConnection(true);
        
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
    public void fetchActivationStatus(final Promise promise) {

        //final PowerAuthModule thiz = this;

        this.powerAuth.fetchActivationStatusWithCallback(this.context, new IActivationStatusListener() {
            @Override
            public void onActivationStatusSucceed(ActivationStatus status) {
                promise.resolve(status);
            }
      
            @Override
            public void onActivationStatusFailed(Throwable t) {
                promise.reject(PowerAuthModule.getErrorCodeFromThrowable(t) ,t);
            }
          });
    }

    static String getErrorCodeFromThrowable(Throwable t) {

        PowerAuthErrorException paEx = (t instanceof PowerAuthErrorException ? (PowerAuthErrorException)t : null);
        if (paEx == null) {
            return "PA2ReactNativeError";
        }

        switch (paEx.getPowerAuthErrorCode()) {
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
            default: return String.format("PA2UnknownCode%i", paEx.getPowerAuthErrorCode());
        }
    }
}