import { PowerAuthRecoveryActivationData } from "./PowerAuthRecoveryActivationData";
/**
 * Success object returned by "createActivation" call.
 */
export interface PowerAuthCreateActivationResult {
    activationFingerprint: string;
    activationRecovery?: PowerAuthRecoveryActivationData;
    customAttributes?: any;
}
