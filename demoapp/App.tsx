import React, { Component } from 'react';
import { StyleSheet, View, Button, Text, ScrollView, Picker, Platform } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Prompt from 'rn-prompt';
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import {PowerAuthActivationCodeUtil} from 'react-native-powerauth-mobile-sdk/lib/PowerAuthActivationCodeUtil';
import {PowerAuthActivation} from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';
import {PowerAuthAuthentication} from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthAuthentication';
import {PowerAuthBiometryInfo} from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthBiometryInfo';
import {PowerAuthError} from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthError';
import { PowerAuthConfiguration } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthConfiguration';
import { PowerAuthClientConfiguration } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthClientConfiguration';
import { PowerAuthKeychainConfiguration, PowerAuthKeychainProtection } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthKeychainConfiguration';
import { PowerAuthBiometryConfiguration } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthBiometryConfiguration';
import * as AppConfig from './AppConfig.json';

interface State {
  // activation status
  hasValidActivation?: boolean;
  canStartActivation?: boolean;
  hasPendingActivation?: boolean;
  activationId?: string;
  activationFingerprint?: string;
  activationStatus?: string;
  biometryStatus?: PowerAuthBiometryInfo;
  // prompts
  promptVisible: boolean;
  promptLabel: string;
  // activation dropdown
  isActivationDropdownOpen: boolean;
  selectedPowerAuthInstanceId: string;

  promptCallback: (password: string) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default class App extends Component<any, State> {

  tokenName = "possession_universal";

  powerAuth: PowerAuth = new PowerAuth("your-app-activation");

  constructor(props: any) {
    super(props);

    this.state = {
      promptVisible: false,
      promptLabel: "Enter password",
      isActivationDropdownOpen: false,
      selectedPowerAuthInstanceId: "your-app-activation",

      promptCallback: _ => {}
    };

    this.setupPowerAuth(false);
  }

  async setupPowerAuth(advancedConfig: boolean) {
    const isConfigured = await this.powerAuth.isConfigured();
    if (isConfigured) {
      console.log(`PowerAuth instance "${this.state.selectedPowerAuthInstanceId}" was already configured.`);
      await this.refreshActivationInfo();
    } else {
      console.log(`PowerAuth instance "${this.state.selectedPowerAuthInstanceId}" isn't configured, configuring...`);
      try {
        let appKey                  = AppConfig.powerAuth.appKey
        let appSecret               = AppConfig.powerAuth.appSecret
        let masterServerPublicKey   = AppConfig.powerAuth.masterServerPublicKey
        let baseUrl                 = AppConfig.powerAuth.baseUrl
        let allowUnsecureConnection = AppConfig.powerAuth.allowUnsecureConnection
        if (appKey == "your-app-key") {
          console.log(`Please modify AppConfig.json with a valid PowerAuth configuration.`);
          return
        }
        if (advancedConfig) {
          // Advanced config
          let configuration = new PowerAuthConfiguration(appKey, appSecret, masterServerPublicKey, baseUrl)
          let clientConfiguration = new PowerAuthClientConfiguration()
          clientConfiguration.enableUnsecureTraffic = allowUnsecureConnection
          clientConfiguration.readTimeout = 10
          clientConfiguration.connectionTimeout = 5
          let biometryConfiguration = new PowerAuthBiometryConfiguration()
          biometryConfiguration.linkItemsToCurrentSet = false
          biometryConfiguration.fallbackToDevicePasscode = true
          biometryConfiguration.authenticateOnBiometricKeySetup = true
          biometryConfiguration.confirmBiometricAuthentication = true
          let keychainConfiguration = new PowerAuthKeychainConfiguration()
          keychainConfiguration.minimalRequiredKeychainProtection = PowerAuthKeychainProtection.SOFTWARE
          await this.powerAuth.configure(configuration, clientConfiguration, biometryConfiguration, keychainConfiguration)
        } else {
          // Basic config
          await this.powerAuth.configure(appKey, appSecret, masterServerPublicKey, baseUrl, allowUnsecureConnection);
        }
        console.log(`PowerAuth instance "${this.state.selectedPowerAuthInstanceId}" configuration successfull.`);
        await this.refreshActivationInfo();
      } catch(e) {
          console.log(`PowerAuth instance "${this.state.selectedPowerAuthInstanceId}" failed to configure: ${e.code}`);
      }
    }
  }

  async refreshActivationInfo() {

    try {
      const id = await this.powerAuth.getActivationIdentifier();
      const fp = await this.powerAuth.getActivationFingerprint();
      const valid = await this.powerAuth.hasValidActivation();
      const canStart = await this.powerAuth.canStartActivation();
      const pending = await this.powerAuth.hasPendingActivation();
      const bioStatus = await this.powerAuth.getBiometryInfo();

      this.setState({
        activationId: id,
        activationFingerprint: fp,
        hasValidActivation: valid,
        canStartActivation: canStart,
        hasPendingActivation: pending,
        activationStatus: "Fetching...",
        biometryStatus: bioStatus
      }, async () => {
        let status = "";
        try {
          status = (await this.powerAuth.fetchActivationStatus()).state;
        } catch (e) {
          this.printPAException(e);
          status = e.code;
        }
        this.setState({
          activationStatus: status
        });
      })
    } catch(e) {
      alert(`Refresh failed: ${e.code}`);
      this.printPAException(e);
    }
  }

  render() {
    return (
      <View style={{zIndex: 1000}}>
        <View style={styles.container}>
          <Text style={styles.titleText}>Activation Selector</Text>

          {/* !!! current DropDownPicker contains definition errors, but the app will run OK */}
          <DropDownPicker
            dropDownDirection={"BOTTOM"}
            listMode={Platform.OS == "android" ? "MODAL" : "FLATLIST"} // hack for android, the componennt is stupid
            searchable={false}
            showTickIcon={false}
            open={this.state.isActivationDropdownOpen}
            value={this.state.selectedPowerAuthInstanceId}
            items={[
              {label: 'Activation 1', value: 'your-app-activation'},
              {label: 'Activation 2', value: 'your-app-activation2'}
            ]}
            setValue={ async (value: any) => {
              this.powerAuth = new PowerAuth(value());
              this.setState({
                selectedPowerAuthInstanceId: value(),
                isActivationDropdownOpen: false
              });
              await this.setupPowerAuth(false);
              await this.refreshActivationInfo();
            }}
            setItems={() => {}}
            setOpen={val => {
              this.setState({
                isActivationDropdownOpen: val
              })
            }}
          />
        </View>
        <ScrollView style={{zIndex: 900}}>
          <View style={styles.scrollContainer}>
            <Text style={styles.titleText}>Activation status</Text>
            <Text style={styles.actLabel}>Has valid activation</Text>
            <Text style={styles.actVal}>{`${this.state.hasValidActivation}`}</Text>
            <Text style={styles.actLabel}>Can start activation</Text>
            <Text style={styles.actVal}>{`${this.state.canStartActivation}`}</Text>
            <Text style={styles.actLabel}>Has pending activation</Text>
            <Text style={styles.actVal}>{`${this.state.hasPendingActivation}`}</Text>
            <Text style={styles.actLabel}>Activation ID</Text>
            <Text style={styles.actVal}>{`${this.state.activationId}`}</Text>
            <Text style={styles.actLabel}>Activation fingerprint</Text>
            <Text style={styles.actVal}>{`${this.state.activationFingerprint}`}</Text>
            <Text style={styles.actLabel}>Activation status</Text>
            <Text style={styles.actVal}>{`${this.state.activationStatus}`}</Text>
            <Text style={styles.actLabel}>Biometry status</Text>
            <Text style={styles.actVal}>can authenticate: {`${this.state.biometryStatus?.canAuthenticate}`}</Text>
            <Text style={styles.actVal}>biometry type: {`${this.state.biometryStatus?.biometryType}`}</Text>
            <Text style={styles.actVal}>is available: {`${this.state.biometryStatus?.isAvailable}`}</Text>
            <Button title="Refresh data" onPress={_ => { this.refreshActivationInfo() }} />
            <Button title="Deconfigure" onPress={ async _ => { 
              try { 
                await this.powerAuth.deconfigure();
                alert("Deconfigured");
                console.log(`PowerAuth instance "${this.state.selectedPowerAuthInstanceId}" was deconfigured.`)
              } catch (e) { 
                this.printPAException(e); 
              } 
            }} />
          <Button title="Reconfigure (basic)" onPress={ async _ => { 
              this.setupPowerAuth(false); 
            }} />
          <Button title="Reconfigure (advanced)" onPress={ async _ => { 
              this.setupPowerAuth(true); 
            }} />
            <Text style={styles.titleText}>Create activation</Text>
            <Button title="Create activation: Activation Code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter activation code", promptCallback: async activationCode => {
              const activation = PowerAuthActivation.createWithActivationCode(activationCode, "ReactNativeTest");
              try {
                let result = await this.powerAuth.createActivation(activation);
                console.log(result);
                alert(`Activation created`);
              } catch (e) {
                alert(`Activation failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            } }) }} />
            <Button title="Commit activation with password" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Commit activation", promptCallback: async pass => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = pass;
              auth.useBiometry = false;
              auth.biometryMessage = "tadaaa";
              try {
                await this.powerAuth.commitActivation(auth)
                alert(`Commited!`);
              } catch (e) {
                alert(`Commit failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            } }) }} />

            <Text style={styles.titleText}>Remove activation</Text>
            <Button title="Remove activation with password" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Remove activation", promptCallback: async pass => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = pass;
              auth.useBiometry = false;
              auth.biometryMessage = "tadaaa";
              try {
                await this.powerAuth.removeActivationWithAuthentication(auth);
                alert(`Removed`);
              } catch (e) {
                alert(`Remove failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            } }) }} />
            <Button title="Remove activation with biometry" onPress={ async _ => { 
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.useBiometry = true;
              auth.biometryMessage = "Do you want to remove activation?";
              auth.biometryTitle = "Remove activation"
              try {
                await this.powerAuth.removeActivationWithAuthentication(auth);
                alert(`Removed`);
              } catch (e) {
                alert(`Remove failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            }} />
            <Button title="Remove activation local" onPress={async e => {
              await this.powerAuth.removeActivationLocal();
              this.refreshActivationInfo();
              alert("Done!")
            }} />

            <Text style={styles.titleText}>Password ops</Text>
            <Button title="Validate password" onPress={e => {
              this.setState({ promptVisible: true, promptLabel: "Password", promptCallback: async pass => {
                try {
                  const result = await this.powerAuth.validatePassword(pass);
                  alert(`Password valid`);
                } catch (e) {
                  alert(`Not valid: ${e.code}`);
                  this.printPAException(e);
                }
              }});
            }} />
            <Button title="Changed password (online)" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter old password", promptCallback: async oldPassword => {
              setTimeout(async () => {
                this.setState({ promptVisible: true, promptLabel: "Enter new password", promptCallback: async newPassword => {
                  try {
                    await this.powerAuth.changePassword(oldPassword, newPassword);
                    alert("Password changed");
                  } catch (e) {
                    alert(`Change failed: ${e.code}`);
                    this.printPAException(e);
                  }
                } })
              }, 200);
            }})}}/>
            <Button title="Changed password (offline - unsafe)" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter old password", promptCallback: async oldPassword => {
              setTimeout(async () => {
                this.setState({ promptVisible: true, promptLabel: "Enter new password", promptCallback: async newPassword => {
                  try {
                    await this.powerAuth.unsafeChangePassword(oldPassword, newPassword);
                    alert("Password changed");
                  } catch (e) {
                    alert(`Change failed: ${e.code}`);
                    this.printPAException(e);
                  }
                } })
              }, 200);
            }})}}/>

            <Text style={styles.titleText}>Biometry</Text>
            <Button title="Is biometry set" onPress={ async _ => {
              const hasRecovery = await this.powerAuth.hasBiometryFactor();
              alert(`Biometry factor present: ${hasRecovery}`);
            }} />
            <Button title="Add biometry factor" onPress={ async _ => {
              this.setState({ promptVisible: true, promptLabel: "Enter password", promptCallback: async pass => {
                try {
                  const r = await this.powerAuth.addBiometryFactor(pass, "Add biometry", "Allow biometry factor");
                  alert(`Biometry factor added`);
                } catch (e) {
                  alert(`Failed: ${e.code}`);
                  this.printPAException(e);
                }
              }})}} />
            <Button title="Remove biometry factor" onPress={ async _ => {
              const result =  await this.powerAuth.removeBiometryFactor();
              alert(`Biometry factor removed: ${result}`);
            }} />
            <Button title="Test offlineSignature (biometry)" onPress={ async _ => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = null;
              auth.useBiometry = true;
              auth.biometryMessage = "tadaaa";
              try {
                const r = await this.powerAuth.offlineSignature(auth, "/pa/signature/validate", "VGhpcyBpcyBzZWNyZXQhIQ==", "body");
                alert(`Signature: ${r}`);
              } catch (e) {
                alert(`Signature calculation failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            }} />

            <Text style={styles.titleText}>Recovery</Text>
            <Button title="Has recovery data" onPress={ async _ => {
              const hasRecovery = await this.powerAuth.hasActivationRecoveryData();
              alert(`Recovery data present: ${hasRecovery}`);
            }} />
            <Button title="Show recovery data" onPress={e => {
              this.setState({ promptVisible: true, promptLabel: "Password", promptCallback: async pass => {
                try {
                  const auth = new PowerAuthAuthentication();
                  auth.usePossession = true;
                  auth.userPassword = pass;
                  auth.useBiometry = false;
                  auth.biometryMessage = "tadaaa";
                  const result = await this.powerAuth.activationRecoveryData(auth);
                  alert(`Code: ${result.recoveryCode}\nPUK: ${result.puk}`);
                } catch (e) {
                  alert(`Failed: ${e.code}`);
                  console.log(new PowerAuthError(e).print());
                }
              }});
            }} />
            <Text style={styles.titleText}>Token based authentication</Text>
            <Button title="Get token from server" onPress={ async _ => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              try {
                const t = await this.powerAuth.tokenStore.requestAccessToken(this.tokenName, auth);
                const h = await this.powerAuth.tokenStore.generateHeaderForToken(this.tokenName);
                alert(`isValid: ${t.isValid}\ntokenName:${t.tokenName}\nidentifier:${t.tokenIdentifier}\ncanGenerateHeader:${t.canGenerateHeader}\nhttpHeader:${h?.key}:${h?.value}`);
              } catch (e) {
                alert(`requestAccessToken failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Remove token from server" onPress={ async _ => {
              try {
                await this.powerAuth.tokenStore.removeAccessToken(this.tokenName);
                alert(`Removed`);
              } catch (e) {
                alert(`removeAccessToken failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Has local token" onPress={ async _ => {
              try {
                const r = await this.powerAuth.tokenStore.hasLocalToken(this.tokenName);
                alert(`Has token: ${r}`);
              } catch (e) {
                alert(`hasLocalToken failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Get local token" onPress={ async _ => {
              try {
                const t = await this.powerAuth.tokenStore.getLocalToken(this.tokenName);
                const h = await this.powerAuth.tokenStore.generateHeaderForToken(this.tokenName);
                alert(`isValid: ${t.isValid}\ntokenName:${t.tokenName}\nidentifier:${t.tokenIdentifier}\ncanGenerateHeader:${t.canGenerateHeader}\nhttpHeader:${h?.key}:${h?.value}`);
              } catch (e) {
                alert(`hasLocalToken failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Remove local token" onPress={ async _ => {
              try {
                await this.powerAuth.tokenStore.removeLocalToken(this.tokenName);
                alert(`Removed`);
              } catch (e) {
                alert(`removeLocalToken failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Remove all local tokens" onPress={ async _ => {
              try {
                await this.powerAuth.tokenStore.removeAllLocalTokens();
                alert(`Removed`);
              } catch (e) {
                alert(`removeAllLocalTokens failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />

            <Text style={styles.titleText}>Other</Text>
            <Button title="Fetch encryption key" onPress={ _ => {
                this.setState({ promptVisible: true, promptLabel: "Enter password", promptCallback: async pass => {
                  const auth = new PowerAuthAuthentication();
                  auth.usePossession = true;
                  auth.userPassword = pass;
                  auth.useBiometry = false;
                  auth.biometryMessage = "tadaaa";
                  try {
                    const r = await this.powerAuth.fetchEncryptionKey(auth,0);
                    alert(`Key: ${r}`);
                  } catch (e) {
                    alert(`Failed: ${e.code}`);
                    this.printPAException(e);
                  }
                  await this.refreshActivationInfo();
                } })
            }} />
            <Button title="Test offlineSignature" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter password", promptCallback: async pass => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = pass;
              auth.useBiometry = false;
              auth.biometryMessage = "tadaaa";
              try {
                const r = await this.powerAuth.offlineSignature(auth, "/pa/signature/validate", "VGhpcyBpcyBzZWNyZXQhIQ==", "body");
                alert(`Signature: ${r}`);
              } catch (e) {
                alert(`Signature calculation failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            } }) }} />
            <Button title="Test verifyServerSignedData" onPress={ async _ => {
              // TODO: solve this differently, this failes for now as we pass nonsense data
              try {
                const r = await this.powerAuth.verifyServerSignedData("data", "signature", true);
                alert(`Verified: ${r}`);
              } catch (e) {
                alert(`Operation failed: ${e.code}`);
                this.printPAException(e);
              }
            }} />
            <Button title="Test requestGetSignature" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter password", promptCallback: async pass => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = pass;
              auth.useBiometry = false;
              auth.biometryMessage = "tadaaa";
              try {
                const r = await this.powerAuth.requestGetSignature(auth, "/pa/signature/validate", { testParam: "testvalue" });
                alert(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
                console.log(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
              } catch (e) {
                alert(`Operation failed: ${e.code}`);
                this.printPAException(e);
              }
              await this.refreshActivationInfo();
            } }) }} />
            <Button title="Test requestSignature" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter password", promptCallback: async pass => {
              const auth = new PowerAuthAuthentication();
              auth.usePossession = true;
              auth.userPassword = pass;
              auth.useBiometry = false;
              auth.biometryMessage = "tadaaa";
              try {
                const r = await this.powerAuth.requestSignature(auth, "POST", "/pa/signature/validate", "{jsonbody: \"yes\"}");
                alert(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
                console.log(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
              } catch(e) {
                alert(`Operation failed: ${e.code}`);
                this.printPAException(e);
              }
            } }) }} />

            <Text style={styles.titleText}>Validation</Text>
            <Button title="Parse activation code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter activation code", promptCallback: async code => {
              await sleep(100);
              try {
                let ac = await PowerAuthActivationCodeUtil.parseActivationCode(code);
                alert(`CODE:${ac.activationCode}\nSIGNATURE:${ac.activationSignature}`);
              } catch(e) {
                alert(`Not valid: ${e.code}`);
                console.log(e.code);
              }
            } }) }} />
            <Button title="Parse recovery code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter recovery code", promptCallback: async code => {
              await sleep(100);
              try {
                let ac = await PowerAuthActivationCodeUtil.parseRecoveryCode(code);
                alert(`CODE:${ac.activationCode}\nSIGNATURE:${ac.activationSignature}`);
              } catch(e) {
                alert(`Not valid: ${e.code}`);
                console.log(e.code);
              }
            } }) }} />
            <Button title="Is valid activation code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter activation code", promptCallback: async code => {
              await sleep(100);
              let valid = await PowerAuthActivationCodeUtil.validateActivationCode(code);
              alert(`IsValid: ${valid}`);
            } }) }} />
            <Button title="Is valid recovery code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter recovery code", promptCallback: async code => {
              await sleep(100);
              let valid = await PowerAuthActivationCodeUtil.validateRecoveryCode(code);
              alert(`IsValid: ${valid}`);
            } }) }} />
            <Button title="Is valid recovery PUK" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter recovery PUK", promptCallback: async code => {
              await sleep(100);
              let valid = await PowerAuthActivationCodeUtil.validateRecoveryPuk(code);
              alert(`IsValid: ${valid}`);
            } }) }} />
            <Button title="Is valid activation code character" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter character", promptCallback: async code => {
              await sleep(100);
              let valid = await PowerAuthActivationCodeUtil.validateTypedCharacter(code.charCodeAt(0));
              alert(`IsValid: ${valid}`);
            } }) }} />
            <Button title="Correct activation code" onPress={ _ => { this.setState({ promptVisible: true, promptLabel: "Enter code", promptCallback: async code => {
              await sleep(100);
              let result = "";
              for (let i = 0; i < code.length; i++) {
                try {
                  const corrected = await PowerAuthActivationCodeUtil.correctTypedCharacter(code.charCodeAt(i));
                  result += String.fromCharCode(corrected);
                } catch (e) {
                  console.log(`invalid character: ${code.charCodeAt(i)}`);
                }
              }
              alert(`Corrected: ${result}`);
            } }) }} />

            <Prompt
                title={this.state.promptLabel}
                placeholder=""
                defaultValue=""
                visible={ this.state.promptVisible }
                onCancel={ () => this.setState({
                  promptVisible: false
                }) }
                onSubmit={ (value: string) => {
                  this.setState({
                    promptVisible: false
                  }, () => {
                    this.state.promptCallback(value);
                  });
                }}
            />
          </View>
        </ScrollView>
      </View>
    )
  }

  printPAException(pe: PowerAuthError) {
    console.log(`### PowerAuthError ####`);
    console.log(`# CODE: ${pe.code}`);
    console.log(`# MESSAGE: ${pe.message}`);
    console.log(`# ERROR DATA: ${pe.errorData ? JSON.stringify(pe.errorData) : "null"}`);
    console.log(`# ORIGINAL EXCEPTION:\n ${JSON.stringify(pe.originalException)}`);
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    marginBottom: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    zIndex: 1000
  },
  scrollContainer: {
    zIndex: 900,
    marginTop: 10,
    marginBottom: 160,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 23,
    fontWeight: "600",
    marginTop: 20
  },
  status: {
    marginTop: 10,
    fontFamily: "courier",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "400",
  },
  actLabel: {
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "400",
  },
  actVal: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
});
