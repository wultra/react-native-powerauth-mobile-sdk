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
 * The `PowerAuthActivation` object contains activation data required for the activation creation. The object supports
 * all types of activation currently supported in the SDK.
 */
export class PowerAuthActivation {

    /** parameters that are filled by create* methods  */ 

    activationName: string
    activationCode?: string
    recoveryCode?: string
    recoveryPuk?: string
    identityAttributes: any
    
    /** Extra attributes of the activation, used for application specific purposes (for example, info about the clientdevice or system). This extras string will be associated with the activation record on PowerAuth Server. */
    extras?: string

    /** Custom attributes object that are processed on Intermediate Server Application. Note that this custom data will not be associated with the activation record on PowerAuth Server */
    customAttributes: any

    /** Additional activation OTP that can be used only with a regular activation, by activation code */
    additionalActivationOtp?: string

    /**
     * Private constructor, used internally.
     * @param activationName Activation name to be assigned to new activation.
     */
    private constructor(activationName: string) {
        this.activationName = activationName;
    }

    /**
     * Create an instance of `PowerAuthActivation` configured with the activation code. The activation code may contain
     * an optional signature part, in case that it is scanned from QR code.
     *  
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     * 
     * @param activationCode Activation code, obtained either via QR code scanning or by manual entry.
     * @param name Activation name to be used for the activation.
     * @returns New instance of `PowerAuthActivation`.
     */
    static createWithActivationCode(activationCode: string, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation(name);
        a.activationName = name;
        a.activationCode = activationCode;
        return a;
    }

    /**
     * Creates an instance of `PowerAuthActivation` with a recovery activation code and PUK.
     * 
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     * 
     * @param recoveryCode Recovery code, obtained either via QR code scanning or by manual entry.
     * @param recoveryPuk PUK obtained by manual entry.
     * @param name Activation name to be used for the activation.
     * @returns New instance of `PowerAuthActivation`.
     */
    static createWithRecoveryCode(recoveryCode: string, recoveryPuk: string, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation(name);
        a.activationName = name;
        a.recoveryCode = recoveryCode;
        a.recoveryPuk = recoveryPuk;
        return a;
    }

    /**
     * Creates an instance of `PowerAuthActivation` with an identity attributes for the custom activation purposes.
     * 
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     * 
     * @param identityAttributes Custom activation parameters that are used to prove identity of a user (each object value is serialized and used).
     * @param name Activation name to be used for the activation.
     * @returns New instance of `PowerAuthActivation`.
     */
    static createWithIdentityAttributes(identityAttributes: any, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation(name);
        a.activationName = name;
        a.identityAttributes = identityAttributes;
        return a;
    }
};