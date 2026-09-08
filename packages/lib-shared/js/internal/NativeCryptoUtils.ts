import { NativeModulesProvider } from './NativeModulesProvider';
import { Base64String } from "../PowerAuthCryptoUtils";

export interface PowerAuthCryptoUtilsIfc {
    hashSha256(data: Base64String): Promise<Base64String>
    randomBytes(length: number): Promise<Base64String>
}

export const NativeCryptoUtils = NativeModulesProvider.PowerAuthCryptoUtils;