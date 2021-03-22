import { PA2ActivationState } from './PA2ActivationState';
export interface PowerAuthActivationStatus {
    state: PA2ActivationState;
    failCount: number;
    maxFailCount: number;
    remainingAttempts: number;
}
