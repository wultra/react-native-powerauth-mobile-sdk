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

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.ActivityProvider;
import com.wultra.android.powerauth.js.PowerAuthJsModule;

import javax.annotation.Nonnull;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuth")
public class PowerAuthModule extends ReactContextBaseJavaModule {

    private final PowerAuthJsModule powerAuthJsModule;

    private final ReactApplicationContext context;
    private final ObjectRegister objectRegister;
    private final PowerAuthPasswordModule passwordModule;

    private final ActivityProvider activityProvider = () -> getCurrentActivity();

    public PowerAuthModule(ReactApplicationContext context, @NonNull ObjectRegister objectRegister, @NonNull PowerAuthPasswordModule passwordModule) {
        super(context);
        this.context = context;
        this.objectRegister = objectRegister;
        this.passwordModule = passwordModule;
        this.powerAuthJsModule = new PowerAuthJsModule(context, activityProvider, objectRegister.getObjectRegisterJs(), passwordModule.getPowerAuthPasswordJsModule());
    }

    public PowerAuthJsModule getPowerAuthJsModule() {
        return powerAuthJsModule;
    }

    // React integration

    @NonNull
    @Override
    public String getName() {
        return powerAuthJsModule.getName();
    }

    @ReactMethod
    public void isConfigured(@Nonnull String instanceId, final Promise promise) {
        powerAuthJsModule.isConfigured(instanceId, promise);
    }

    @ReactMethod
    public void configure(final String instanceId, final ReadableMap configuration, final ReadableMap clientConfiguration, final ReadableMap biometryConfiguration, final ReadableMap keychainConfiguration, final ReadableMap sharingConfiguration, Promise promise) {
        powerAuthJsModule.configure(instanceId, configuration, clientConfiguration, biometryConfiguration, keychainConfiguration, sharingConfiguration, promise);
    }

    @ReactMethod
    public void deconfigure(String instanceId, final Promise promise) {
        powerAuthJsModule.deconfigure(instanceId, promise);
    }

    @ReactMethod
    public void hasValidActivation(String instanceId, final Promise promise) {
        powerAuthJsModule.hasValidActivation(instanceId, promise);
    }

    @ReactMethod
    public void canStartActivation(String instanceId, final Promise promise) {
        powerAuthJsModule.canStartActivation(instanceId, promise);
    }

    @ReactMethod
    public void hasPendingActivation(String instanceId, final Promise promise) {
        powerAuthJsModule.hasPendingActivation(instanceId, promise);
    }

    @ReactMethod
    public void activationIdentifier(String instanceId, final Promise promise) {
        powerAuthJsModule.activationIdentifier(instanceId, promise);
    }

    @ReactMethod
    public  void activationFingerprint(String instanceId, final Promise promise) {
        powerAuthJsModule.activationFingerprint(instanceId, promise);
    }

    @ReactMethod
    public void getExternalPendingOperation(String instanceId, final Promise promise) {
        powerAuthJsModule.getExternalPendingOperation(instanceId, promise);
    }

    @ReactMethod
    public void fetchActivationStatus(String instanceId, final Promise promise) {
        powerAuthJsModule.fetchActivationStatus(instanceId, promise);
    }

    @ReactMethod
    public void createActivation(String instanceId, final ReadableMap activation, final Promise promise) {
        powerAuthJsModule.createActivation(instanceId, activation, promise);
    }

    @ReactMethod
    public void commitActivation(String instanceId, final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.commitActivation(instanceId, authMap, promise);
    }

    @ReactMethod
    public void removeActivationWithAuthentication(String instanceId,final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.removeActivationWithAuthentication(instanceId, authMap, promise);
    }

    @ReactMethod
    public void removeActivationLocal(String instanceId, final Promise promise) {
        powerAuthJsModule.removeActivationLocal(instanceId, promise);
    }

    @ReactMethod
    public void requestGetSignature(String instanceId, final ReadableMap authMap, final String uriId, @Nullable final ReadableMap params, final Promise promise) {
        powerAuthJsModule.requestGetSignature(instanceId, authMap, uriId, params, promise);
    }

    @ReactMethod
    public void requestSignature(String instanceId, final ReadableMap authMap, final String method, final String uriId, final  @Nullable String body, final Promise promise) {
        powerAuthJsModule.requestSignature(instanceId, authMap, method, uriId, body, promise);
    }

    @ReactMethod
    public void offlineSignature(String instanceId, final ReadableMap authMap, final String uriId, final  @Nullable String body, final String nonce, final Promise promise) {
        powerAuthJsModule.offlineSignature(instanceId, authMap, uriId, body, nonce, promise);
    }

    @ReactMethod
    public void verifyServerSignedData(String instanceId, final String data, final String signature, final boolean masterKey, final Promise promise) {
        powerAuthJsModule.verifyServerSignedData(instanceId, data, signature, masterKey, promise);
    }

    @ReactMethod
    public void unsafeChangePassword(String instanceId, final Dynamic oldPassword, final Dynamic newPassword, final Promise promise) {
        powerAuthJsModule.unsafeChangePassword(instanceId, oldPassword, newPassword, promise);
    }

    @ReactMethod
    public void changePassword(String instanceId, final Dynamic oldPassword, final Dynamic newPassword, final Promise promise) {
        powerAuthJsModule.changePassword(instanceId, oldPassword, newPassword, promise);
    }

    @ReactMethod
    public void addBiometryFactor(String instanceId, final Dynamic password, final ReadableMap prompt, final Promise promise) {
        powerAuthJsModule.addBiometryFactor(instanceId, password, prompt, promise);
    }

    @ReactMethod
    public void hasBiometryFactor(String instanceId, final Promise promise) {
        powerAuthJsModule.hasBiometryFactor(instanceId, promise);
    }

    @ReactMethod
    public void removeBiometryFactor(String instanceId, final Promise promise) {
        powerAuthJsModule.removeBiometryFactor(instanceId, promise);
    }

    @ReactMethod
    public void getBiometryInfo(String instanceId, final Promise promise) {
        powerAuthJsModule.getBiometryInfo(instanceId, promise);
    }

    @ReactMethod
    public void fetchEncryptionKey(String instanceId, final ReadableMap authMap, final int index, final Promise promise) {
        powerAuthJsModule.fetchEncryptionKey(instanceId, authMap, index, promise);
    }

    @ReactMethod
    public void signDataWithDevicePrivateKey(String instanceId, final ReadableMap authMap, final String data, final Promise promise) {
        powerAuthJsModule.signDataWithDevicePrivateKey(instanceId, authMap, data, promise);
    }

    @ReactMethod
    public void validatePassword(String instanceId, final Dynamic password, final Promise promise) {
        powerAuthJsModule.validatePassword(instanceId, password, promise);
    }

    @ReactMethod
    public void hasActivationRecoveryData(String instanceId, final Promise promise) {
        powerAuthJsModule.hasActivationRecoveryData(instanceId, promise);
    }

    @ReactMethod
    public void activationRecoveryData(String instanceId, final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.activationRecoveryData(instanceId, authMap, promise);
    }

    @ReactMethod
    public void confirmRecoveryCode(String instanceId, final String recoveryCode, final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.confirmRecoveryCode(instanceId, recoveryCode, authMap, promise);
    }

    @ReactMethod
    public void authenticateWithBiometry(String instanceId, final ReadableMap prompt, final boolean makeReusable, final Promise promise) {
        powerAuthJsModule.authenticateWithBiometry(instanceId, prompt, makeReusable, promise);
    }

    // TOKEN BASED AUTHENTICATION

    @ReactMethod
    public void requestAccessToken(String instanceId, final String tokenName, final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.requestAccessToken(instanceId, tokenName, authMap, promise);
    }

    @ReactMethod
    public void removeAccessToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.removeAccessToken(instanceId, tokenName, promise);
    }

    @ReactMethod
    public void getLocalToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.getLocalToken(instanceId, tokenName, promise);
    }

    @ReactMethod
    public void hasLocalToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.hasLocalToken(instanceId, tokenName, promise);
    }

    @ReactMethod
    public void removeLocalToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.removeLocalToken(instanceId, tokenName, promise);
    }

    @ReactMethod
    public void removeAllLocalTokens(String instanceId, final Promise promise) {
        powerAuthJsModule.removeAllLocalTokens(instanceId, promise);
    }

    @ReactMethod
    public void generateHeaderForToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.generateHeaderForToken(instanceId, tokenName, promise);
    }

    // ACTIVATION CODE UTIL METHODS

    @ReactMethod
    public void parseActivationCode(String activationCode, final Promise promise) {
        powerAuthJsModule.parseActivationCode(activationCode, promise);
    }

    @ReactMethod
    public void validateActivationCode(String activationCode, final Promise promise) {
        powerAuthJsModule.validateActivationCode(activationCode, promise);
    }

    @ReactMethod
    public void parseRecoveryCode(String recoveryCode, final Promise promise) {
        powerAuthJsModule.parseRecoveryCode(recoveryCode, promise);
    }

    @ReactMethod
    public void validateRecoveryCode(String recoveryCode, final Promise promise) {
        powerAuthJsModule.validateRecoveryCode(recoveryCode, promise);
    }

    @ReactMethod
    public void validateRecoveryPuk(String puk, final Promise promise) {
        powerAuthJsModule.validateRecoveryPuk(puk, promise);
    }

    @ReactMethod
    public void validateTypedCharacter(int character, final Promise promise) {
        powerAuthJsModule.validateTypedCharacter(character, promise);
    }

    @ReactMethod
    public void correctTypedCharacter(int character, final Promise promise) {
        powerAuthJsModule.correctTypedCharacter(character, promise);
    }
}