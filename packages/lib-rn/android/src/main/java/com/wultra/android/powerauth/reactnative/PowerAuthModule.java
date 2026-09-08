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
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.ActivityProvider;
import com.wultra.android.powerauth.js.PowerAuthJsModule;

import javax.annotation.Nonnull;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuth")
public class PowerAuthModule extends ReactContextBaseJavaModule {

    public static final String NAME = "PowerAuth";

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
    public void cleanupInstanceData(final String instanceId, final ReadableMap configuration, final ReadableMap keychainConfiguration, final ReadableMap sharingConfiguration, final Promise promise) {
        powerAuthJsModule.cleanupInstanceData(instanceId, configuration, keychainConfiguration, sharingConfiguration, promise);
    }

    @ReactMethod
    public void getConfiguration(final String instanceId, final Promise promise) {
        powerAuthJsModule.getConfiguration(instanceId, promise);
    }

    @ReactMethod
    public void getCurrentAlgorithm(final String instanceId, final Promise promise) {
        powerAuthJsModule.getCurrentAlgorithm(instanceId, promise);
    }

    @ReactMethod
    public void getClientConfiguration(final String instanceId, final Promise promise) {
        powerAuthJsModule.getClientConfiguration(instanceId, promise);
    }

    @ReactMethod
    public void getBiometryConfiguration(final String instanceId, final Promise promise) {
        powerAuthJsModule.getBiometryConfiguration(instanceId, promise);
    }

    @ReactMethod
    public void getKeychainConfiguration(final String instanceId, final Promise promise) {
        powerAuthJsModule.getKeychainConfiguration(instanceId, promise);
    }

    @ReactMethod
    public void getSharingConfiguration(final String instanceId, final Promise promise) {
        powerAuthJsModule.getSharingConfiguration(instanceId, promise);
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
    public void hasProtocolUpgradeAvailable(String instanceId, final Promise promise) {
        powerAuthJsModule.hasProtocolUpgradeAvailable(instanceId, promise);
    }

    @ReactMethod
    public void hasPendingProtocolUpgrade(String instanceId, final Promise promise) {
        powerAuthJsModule.hasPendingProtocolUpgrade(instanceId, promise);
    }

    @ReactMethod
    public void startProtocolUpgrade(String instanceId, final Dynamic password, final boolean upgradeBiometry, final Promise promise) {
        powerAuthJsModule.startProtocolUpgrade(instanceId, password, upgradeBiometry, promise);
    }

    @ReactMethod
    public void createActivation(String instanceId, final ReadableMap activation, final Promise promise) {
        powerAuthJsModule.createActivation(instanceId, activation, promise);
    }

    @ReactMethod
    public void persistActivation(String instanceId, final ReadableMap authMap, final Promise promise) {
        powerAuthJsModule.persistActivation(instanceId, authMap, promise);
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
    public void authenticationHeaderForRequestWithParams(String instanceId, final ReadableMap authMap, final String method, final String uriId, @Nullable final ReadableMap params, final Promise promise) {
        powerAuthJsModule.authenticationHeaderForRequestWithParams(instanceId, authMap, method, uriId, params, promise);
    }

    @ReactMethod
    public void authenticationHeaderForRequestWithBody(String instanceId, final ReadableMap authMap, final String method, final String uriId, final  @Nullable String body, final Promise promise) {
        powerAuthJsModule.authenticationHeaderForRequestWithBody(instanceId, authMap, method, uriId, body, promise);
    }

    @ReactMethod
    public void offlineAuthenticationCode(String instanceId, final ReadableMap authMap, final String uriId, final  @Nullable String body, final String nonce, final Promise promise) {
        powerAuthJsModule.offlineAuthenticationCode(instanceId, authMap, uriId, body, nonce, promise);
    }

    @ReactMethod
    public void verifyServerSignedData(String instanceId, final String data, final String signature, final boolean masterKey, final Promise promise) {
        powerAuthJsModule.verifyServerSignedData(instanceId, data, signature, masterKey, promise);
    }

    @ReactMethod
    public void verifyDigitalSignature(String instanceId, final String signature, final String data, final String signatureKeyId, final Promise promise) {
        powerAuthJsModule.verifyDigitalSignature(instanceId, signature, data, signatureKeyId, promise);
    }

    @ReactMethod
    public void calculateDigitalSignature(String instanceId, final ReadableMap authMap, final String data, final String signatureKeyId, final Promise promise) {
        powerAuthJsModule.calculateDigitalSignature(instanceId, authMap, data, signatureKeyId, promise);
    }

    @ReactMethod
    public void exportDevicePublicKeys(String instanceId, final String format, final Promise promise) {
        powerAuthJsModule.exportDevicePublicKeys(instanceId, format, promise);
    }

    @ReactMethod
    public void verifyJwsSignature(String instanceId, final String signature, final boolean compact, final boolean strict, final String signatureKeyId, final Promise promise) {
        powerAuthJsModule.verifyJwsSignature(instanceId, signature, compact, strict, signatureKeyId, promise);
    }

    @ReactMethod
    public void calculateJwsSignature(String instanceId, final ReadableMap authMap, final String data, @Nullable final String dataType, final boolean compact, final String signatureKeyId, final Promise promise) {
        powerAuthJsModule.calculateJwsSignature(instanceId, authMap, data, dataType, compact, signatureKeyId, promise);
    }

    @ReactMethod
    public void createCertificateSigningRequest(String instanceId, final ReadableMap authMap, final ReadableMap distinguishedNames, @Nullable final ReadableArray subjectAltNames, final String signatureKeyId, final Promise promise) {
        powerAuthJsModule.createCertificateSigningRequest(instanceId, authMap, distinguishedNames, subjectAltNames, signatureKeyId, promise);
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
    public void beginPasswordChange(String instanceId, final Dynamic oldPassword, final Promise promise) {
        powerAuthJsModule.beginPasswordChange(instanceId, oldPassword, promise);
    }

    @ReactMethod
    public void finishPasswordChange(String instanceId, final Dynamic newPassword, final String passwordChangeDataId, final Promise promise) {
        powerAuthJsModule.finishPasswordChange(instanceId, newPassword, passwordChangeDataId, promise);
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
    public void getBiometricStatus(String instanceId, final Promise promise) {
        powerAuthJsModule.getBiometricStatus(instanceId, promise);
    }

    @ReactMethod
    public void isAuthenticationWithBiometricsAvailable(String instanceId, final Promise promise) {
        powerAuthJsModule.isAuthenticationWithBiometricsAvailable(instanceId, promise);
    }

    @ReactMethod
    public void fetchEncryptionKey(String instanceId, final ReadableMap authMap, final int index, final Promise promise) {
        powerAuthJsModule.fetchEncryptionKey(instanceId, authMap, index, promise);
    }

    @ReactMethod
    public void fetchSecureVaultKey(String instanceId, final ReadableMap authMap, final String keyIdentifier, final Promise promise) {
        powerAuthJsModule.fetchSecureVaultKey(instanceId, authMap, keyIdentifier, promise);
    }

    @ReactMethod
    public void deriveSecureVaultKey(final String objectId, final double index, final int keySize, final Promise promise) {
        powerAuthJsModule.deriveSecureVaultKey(objectId, index, keySize, promise);
    }

    @ReactMethod
    public void signDataWithDevicePrivateKey(String instanceId, final ReadableMap authMap, final String data, final String dataFormat, final Promise promise) {
        powerAuthJsModule.signDataWithDevicePrivateKey(instanceId, authMap, data, dataFormat, promise);
    }

    @ReactMethod
    public void validatePassword(String instanceId, final Dynamic password, final Promise promise) {
        powerAuthJsModule.validatePassword(instanceId, password, promise);
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
    public void generateAuthenticationHeaderForToken(String instanceId, final String tokenName, final Promise promise) {
        powerAuthJsModule.generateAuthenticationHeaderForToken(instanceId, tokenName, promise);
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
    public void validateTypedCharacter(int character, final Promise promise) {
        powerAuthJsModule.validateTypedCharacter(character, promise);
    }

    @ReactMethod
    public void correctTypedCharacter(int character, final Promise promise) {
        powerAuthJsModule.correctTypedCharacter(character, promise);
    }

    // UTILS METHODS

    @ReactMethod
    public void getEnvironmentInfo(final Promise promise) {
        powerAuthJsModule.getEnvironmentInfo(promise);
    }

    // TIME SYNCHRONIZATION METHODS

    @ReactMethod
    public void isTimeSynchronized(String instanceId, final Promise promise) {
        powerAuthJsModule.isTimeSynchronized(instanceId, promise);
    }

    @ReactMethod
    public void localTimeAdjustment(String instanceId, final Promise promise) {
        powerAuthJsModule.localTimeAdjustment(instanceId, promise);
    }

    @ReactMethod
    public void localTimeAdjustmentPrecision(String instanceId, final Promise promise) {
        powerAuthJsModule.localTimeAdjustmentPrecision(instanceId, promise);
    }

    @ReactMethod
    public void currentTime(String instanceId, final Promise promise) {
        powerAuthJsModule.currentTime(instanceId, promise);
    }

    @ReactMethod
    public void resetTimeSynchronization(String instanceId, final Promise promise) {
        powerAuthJsModule.resetTimeSynchronization(instanceId, promise);
    }

    @ReactMethod
    public void synchronizeTime(String instanceId, final Promise promise) {
        powerAuthJsModule.synchronizeTime(instanceId, promise);
    }

    // USER INFO

    @ReactMethod
    public void fetchUserInfo(String instanceId, final Promise promise) {
        powerAuthJsModule.fetchUserInfo(instanceId, promise);
    }

    @ReactMethod
    public void getLastFetchedUserInfo(String instanceId, final Promise promise) {
        powerAuthJsModule.getLastFetchedUserInfo(instanceId, promise);
    }
}
