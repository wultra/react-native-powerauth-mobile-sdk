//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { PowerAuth, PowerAuthActivation, PowerAuthActivationState, PowerAuthAuthentication, PowerAuthError, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { importPassword } from "./helpers/PasswordHelper";
import { TestWithServer } from "./helpers/TestWithServer";

/**
 * This test suite provides a well documented example of usage of important APIs.
 * It doesn't use ActivationHelper or expect, so it's as close as possible to real
 * SDK usage in the regular application.
 */
export class PowerAuth_Example extends TestWithServer {
    
    powerAuth: PowerAuth | undefined
    activationId: string | undefined

    async beforeEach() {
        await super.beforeEach()
        // Just to be sure that SDK is in initial state before each test function
        if (this.powerAuth && await this.powerAuth.isConfigured()) {
            await this.powerAuth.removeActivationLocal()
            await this.powerAuth.deconfigure()
        }
    }

    async afterEach() {
        await super.afterEach()
        // Just to be sure, after each test function we want to remove local activation
        // and cleanup the possible remaining activation on the server.
        if (this.powerAuth && await this.powerAuth.isConfigured()) {
            await this.powerAuth.removeActivationLocal()
            await this.powerAuth.deconfigure()
        }
        if (this.activationId !== undefined) {
            await this.serverApi.activationRemove(this.activationId)
            this.activationId = undefined
        }
    }

    async testActivationFlow() {
        // Instantiate SDK object
        this.powerAuth = new PowerAuth('com.wultra.testapp')

        // You normally get this constants from the backend developers or an infrastructure
        // guys who prepare such data for you.
        const applicationSetup = await this.serverApi.prepareApplicationFromConfiguration()

        // Prepare configuration, you can use PowerAuthConfiguration class, or ConfigurationType interface.
        const configuration = {
            applicationKey: applicationSetup.appKey,
            applicationSecret: applicationSetup.appSecret,
            masterServerPublicKey: applicationSetup.masterServerPublicKey,
            baseEndpointUrl: this.config.enrollment.baseUrl
        }

        // Prepare client configuration.
        //   - make sure we can connect to unsecured endpoints. This option should be always
        //     set to false on the production application.
        const clientConfiguration = { enableUnsecureTraffic: configuration.baseEndpointUrl.startsWith('http://') }

        // You can also alter how biometry behave in the SDK. This is an automatic test, so we don't
        // want to display an biometric dialog when an activation is being commited.
        const biometryConfiguration = { authenticateOnBiometricKeySetup: false }

        // Confitgure SDK
        if (!await this.powerAuth.configure(configuration, clientConfiguration, biometryConfiguration)) {
            // This can happen if some parameters in configuration objects are invalid.
            throw `Failed to configure PowerAuth instance`
        }

        // Initial expectations when your application starts and is not activated
        await this.printActivationState('Initial')

        // OK, now we have properly configured SDK instance, so we can start with the activation
        // This step is typically initiated by user on web application by creating a new activation.
        const userId = this.config.testUser?.userId ?? 'user@example.org'
        const activationData = await this.serverApi.activationInit(applicationSetup.application, userId)

        // Now we can display QR code to the user.
        if (!activationData.activationCode || !activationData.activationSignature) {
           throw `Failed to get data for QR code`
        }
        const activationQrCode = `${activationData.activationCode}#${activationData.activationSignature}`
        this.reportInfo(`Activation QR code: ${activationQrCode}`)

        // Now imagine that user properly scanned the QR code with an activation data, so we have its content available.
        // It's possible to verify in advance whether the code is formally correct and whether was really issued by the server.

        const isValidActivationQrCode = await this.powerAuth.verifyScannedActivationCode(activationQrCode)
        if (!isValidActivationQrCode) {
            // Be aware that this may happen if you have multiple environments in your infrastructure
            // and you're using the wrong setup (see applicationSetup at the beginning of function)
            throw 'Activation code is not valid or is not issued by our server'
        }

        // Everything looks correct, so create the activation locally
        const activation = PowerAuthActivation.createWithActivationCode(activationQrCode, 'My precious activation')
        const activationResult = await this.powerAuth.createActivation(activation)

        // After `createActivation`, you cannot start activation and activation is in pending state
        await this.printActivationState('After create')

        // This step is necessary only for the proper cleanup after the test ends. You normally don't need
        // to use activationId directly in your application.
        this.activationId = await this.powerAuth.getActivationIdentifier()
        if (!this.activationId) throw `Seems that activationId is not available after create`

        // Now your user has an opportunity to verify whether the key-exchange phase was not tampered.
        // Both sides, client and server can calculate activation fingerprint. So you can visually display
        // it in your web application and instruct user to verify the code manually.

        this.reportInfo(`Client's fingerprint: ${activationResult.activationFingerprint}`)

        // This step does web application....
        const activationDetail = await this.serverApi.getActivationDetil(this.activationId)
        this.reportInfo(`Server's fingerprint: ${activationDetail.devicePublicKeyFingerprint}`)

        // ...and user can visually compare the values displayed on mobile device and on the web.
        if (activationResult.activationFingerprint != activationDetail.devicePublicKeyFingerprint) {
            throw 'Fingerprints are different'
        }

        // Now you can instruct user to enter his PIN or password
        const password = this.powerAuth.createPassword()
        await password.addCharacter('1')
        await password.addCharacter('2')
        await password.addCharacter('3')
        await password.addCharacter('5')
        await password.addCharacter('7')
        await password.addCharacter('9')
        const commitAuthentication = PowerAuthAuthentication.commitWithPasswordAndBiometry(password, {
            // The following strings are required on android platform in case that `biometryConfiguration.authenticateOnBiometricKeySetup` is true
            // You can provide some dummy strings in case that flag is false.
            promptTitle: 'Please authenticate with biometry',
            promptMessage: 'Please authenticate to create an activation supporting biometry'
        });
        
        // Now finally commit the activation.
        await this.powerAuth.commitActivation(commitAuthentication)
        
        // After `commit`, you cannot start activation and activation is valid
        await this.printActivationState('After commit')

        // Now it's time to test the activation's status. This method is available after commitActivation()
        
        let status = await this.powerAuth.fetchActivationStatus()
        if (status.state === PowerAuthActivationState.PENDING_COMMIT) {
            // If your enrollment is configured to do not commit activation automatically, then there's one
            // missing step that we have to do on backend's side.
            await this.serverApi.activationCommit(this.activationId)
            // Fetch the status for once more time, it should be active now
            status = await this.powerAuth.fetchActivationStatus()
        }

        if (status.state !== PowerAuthActivationState.ACTIVE) {
            throw `Something is wrong, activation is not ACTIVE`
        }

        // Now you're ready to sign some HTTP requests... The most simple way is to verify the password
        await this.powerAuth.validatePassword(await importPassword('123579'))

        try {
            await this.powerAuth.validatePassword('badpassword')
        } catch (error) {
            if (error instanceof PowerAuthError) {
                if (error.code !== PowerAuthErrorCode.AUTHENTICATION_ERROR) {
                    // Function failed for a different reason
                    throw error
                }
            } else {
                // Function failed for a different reason
                throw error
            }
        }

        // Due to fact, that you entered a bad password, the failed attemps counter is chaged
        status = await this.powerAuth.fetchActivationStatus()
        this.reportInfo(`You entered a bad password. You have ${status.remainingAttempts} from ${status.maxFailCount} attempts left`)

        // So try again...
        await this.powerAuth.validatePassword(await importPassword('123579'))

        // Now remainingAttemtps is back to 5
        status = await this.powerAuth.fetchActivationStatus()
        this.reportInfo(`This looks good. You have ${status.remainingAttempts} from ${status.maxFailCount} attempts left`)

        // Now imagine that something bad happen and operator blocks your activation.
        await this.serverApi.activationBlock(this.activationId)

        status = await this.powerAuth.fetchActivationStatus()
        if (status.state !== PowerAuthActivationState.BLOCKED) {
            throw 'Activation should be blocked'
        }

        // ...it's even worse and the activation was removed on the server.
        // You have opportunity to inform user about this state and then remove the activation locally
        await this.serverApi.activationRemove(this.activationId)

        status = await this.powerAuth.fetchActivationStatus()
        if (status.state !== PowerAuthActivationState.REMOVED) {
            throw 'Activation should be removed now'
        }

        this.reportInfo('Activation has been removed')

        // This is important. Removing activation on the server doesn't affect the local activation data.
        await this.printActivationState('After remove')
        await this.powerAuth.removeActivationLocal()

        // Now everything should be in its initial state
        await this.printActivationState('After cleanup')

        // If PA instance is no longer needed, then just deconfigure it
        await this.powerAuth.deconfigure()
    }

    async printActivationState(stage: string) {
        let hasActivation = await this.powerAuth?.hasValidActivation()
        let canStartActivation = await this.powerAuth?.canStartActivation()
        let hasPendingActivation = await this.powerAuth?.hasPendingActivation()
        this.reportInfo(`${stage}: canStartActivation = ${canStartActivation}, hasPending = ${hasPendingActivation}, hasActivation = ${hasActivation}`)
    }

}