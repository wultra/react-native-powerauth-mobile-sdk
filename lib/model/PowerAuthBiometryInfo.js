/*
 * Copyright 2021 Wultra s.r.o.
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
/**
 * The PowerAuthBiometryType interface provides constants that defines biometry types, supported
 * on the system. In case that device supports multiple biometry types, then GENERIC type
 * is returned.
 */
export var PowerAuthBiometryType;
(function (PowerAuthBiometryType) {
    /**
     * There's no biometry support on the device.
     */
    PowerAuthBiometryType["NONE"] = "NONE";
    /**
     * It's not possible to determine exact type of biometry. This happens on Android 10+ systems,
     * when the device supports more than one type of biometric authentication. In this case,
     * you should use generic terms, like "Authenticate with biometry" for your UI.
     */
    PowerAuthBiometryType["GENERIC"] = "GENERIC";
    /**
     * Fingerprint scanner/TouchID is present on the device.
     */
    PowerAuthBiometryType["FINGERPRINT"] = "FINGERPRINT";
    /**
     * Face scanner/FaceID is present on the device.
     */
    PowerAuthBiometryType["FACE"] = "FACE";
    /**
     * Iris scanner is present on the device.
     */
    PowerAuthBiometryType["IRIS"] = "IRIS";
})(PowerAuthBiometryType || (PowerAuthBiometryType = {}));
/**
 * The PowerAuthBiometryStatus interface defines constants defining various states of biometric
 * authentication support on the system. The status may change during the application lifetime,
 * unless it's NOT_SUPPORTED}.
 */
export var PowerAuthBiometryStatus;
(function (PowerAuthBiometryStatus) {
    /**
     * The biometric authentication can be used right now.
     */
    PowerAuthBiometryStatus["OK"] = "OK";
    /**
     * The biometric authentication is not supported on the device, due to missing hardware or
     * missing support in the operating system.
     */
    PowerAuthBiometryStatus["NOT_SUPPORTED"] = "NOT_SUPPORTED";
    /**
     * The biometric authentication is supported, but there's no biometric image enrolled in the
     * system. User has to add at least one fingerprint, or another type of biometry in the device's
     * settings.
     */
    PowerAuthBiometryStatus["NOT_ENROLLED"] = "NOT_ENROLLED";
    /**
     * The biometric authentication is not available at this time. You can retry the operation later.
     */
    PowerAuthBiometryStatus["NOT_AVAILABLE"] = "NOT_AVAILABLE";
    /**
     * Biometric authentication is supported, but too many failed attempts caused its lockout.
     * User has to authenticate with the password or passcode. (iOS only)
     */
    PowerAuthBiometryStatus["LOCKOUT"] = "LOCKOUT";
})(PowerAuthBiometryStatus || (PowerAuthBiometryStatus = {}));
