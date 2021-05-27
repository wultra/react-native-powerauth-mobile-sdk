import { PowerAuthActivationState } from './PowerAuthActivationState';
export interface PowerAuthActivationStatus {
    state: PowerAuthActivationState;
    failCount: number;
    maxFailCount: number;
    remainingAttempts: number;
}
