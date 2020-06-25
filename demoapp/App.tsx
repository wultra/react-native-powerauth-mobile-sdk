import React, { Component } from 'react';
import { StyleSheet, View, Button, Text, ScrollView } from 'react-native';
import Prompt from 'rn-prompt';
import PowerAuth, { PowerAuthActivation, PowerAuthAuthentication, PowerAuthError } from 'react-native-powerauth-mobile-sdk';

interface State {
  // activation status
  hasValidActivation?: boolean;
  canStartActivation?: boolean;
  hasPendingActivation?: boolean;
  activationId?: string;
  activationFingerprint?: string;
  activationStatus?: string;
  // prompts
  actWithCodePromptVisible: boolean;
  passPromptVisible: boolean;
  passPromptLabel: string;
  passPromptCallback: (password: string) => void;
}

export default class App extends Component<any, State> {

  constructor(props: any) {
    super(props);

    this.state = {
      actWithCodePromptVisible: false,
      passPromptVisible: false,
      passPromptLabel: "Enter password",
      passPromptCallback: _ => {}
    };

    PowerAuth.configure("react-nantive-init", "TBA", "TBA", "TBA", "TBA", true)
      .catch(e => {
        console.log(e);
      }).then(r => {
        console.log("PowerAuth configured");
    });

    this.refreshActivationInfo();
  }

  async refreshActivationInfo() {

    const id = await PowerAuth.getActivationIdentifier();
    const fp = await PowerAuth.getActivationFingerprint();
    const valid = await PowerAuth.hasValidActivation();
    const canStart = await PowerAuth.canStartActivation();
    const pending = await PowerAuth.hasPendingActivation();

    this.setState({
      activationId: id,
      activationFingerprint: fp,
      hasValidActivation: valid,
      canStartActivation: canStart,
      hasPendingActivation: pending,
      activationStatus: "Fetching..."
    }, async () => {
      let status = "";
      try {
        status = (await PowerAuth.fetchActivationStatus()).state;
      } catch (e) {
        status = e.code;
      }
      this.setState({
        activationStatus: status
      });
    })
  }

  async runCreateActivationWithCode(activationCode: string) {
    const activation = PowerAuthActivation.createWithActivationCode(activationCode, "ReactNativeTest");
    try {
      await PowerAuth.createActivation(activation);
      alert(`Activation created`);
    } catch (e) {
      alert(`Activation failed: ${e.code}`);
      console.log(JSON.stringify(e));
    }
    await this.refreshActivationInfo();
  }

  render() {
    return (
      <ScrollView>
        <View style={styles.container}>
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
          <Button title="Refresh data" onPress={_ => { this.refreshActivationInfo() }} />

          <Text style={styles.titleText}>Create activation</Text>
          <Button title="Create activation: Activation Code" onPress={ _ => { this.setState({ actWithCodePromptVisible: true}) }} />
          <Button title="Commit activation with password" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Commit activation", passPromptCallback: async pass => {
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.userPassword = pass;
            auth.useBiometry = true;
            auth.biometryPrompt = "tadaaa";
            try {
              await PowerAuth.commitActivation(auth)
              alert(`Commited!`);
            } catch (e) {
              alert(`Commit failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          } }) }} />

          <Text style={styles.titleText}>Remove activation</Text>
          <Button title="Remove activation with password" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Remove activation", passPromptCallback: async pass => {
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.userPassword = pass;
            auth.useBiometry = false;
            auth.biometryPrompt = "tadaaa";
            try {
              await PowerAuth.removeActivationWithAuthentication(auth);
              alert(`Removed`);
            } catch (e) {
              alert(`Remove failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          } }) }} />
          <Button title="Remove activation with biometry" onPress={ async _ => { 
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.useBiometry = false;
            auth.biometryPrompt = "tadaaa";
            try {
              await PowerAuth.removeActivationWithAuthentication(auth);
              alert(`Removed`);
            } catch (e) {
              alert(`Remove failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          }} />
          <Button title="Remove activation local" onPress={e => {
            PowerAuth.removeActivationLocal();
            alert("Done!")
          }} />

          <Text style={styles.titleText}>Password ops</Text>
          <Button title="Validate password" onPress={e => {
            this.setState({ passPromptVisible: true, passPromptLabel: "Password", passPromptCallback: async pass => {
              try {
                const result = await PowerAuth.validatePassword(pass);
                alert(`Password valid`);
              } catch (e) {
                alert(`Not valid: ${e.code}`);
                console.log(JSON.stringify(e));
              }
            }});
          }} />
          <Button title="Changed password (online)" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Enter old password", passPromptCallback: async oldPassword => {
            setTimeout(async () => {
              this.setState({ passPromptVisible: true, passPromptLabel: "Enter new password", passPromptCallback: async newPassword => {
                try {
                  await PowerAuth.changePassword(oldPassword, newPassword);
                  alert("Password changed");
                } catch (e) {
                  alert(`Change failed: ${e.code}`);
                  console.log(JSON.stringify(e));
                }
              } })
            }, 200);
          }})}}/>
          <Button title="Changed password (offline - unsafe)" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Enter old password", passPromptCallback: async oldPassword => {
            setTimeout(async () => {
              this.setState({ passPromptVisible: true, passPromptLabel: "Enter new password", passPromptCallback: async newPassword => {
                try {
                  await PowerAuth.unsafeChangedPassword(oldPassword, newPassword);
                  alert("Password changed");
                } catch (e) {
                  alert(`Change failed: ${e.code}`);
                  console.log(JSON.stringify(e));
                }
              } })
            }, 200);
          }})}}/>

          <Text style={styles.titleText}>Biometry</Text>
          <Button title="Is biometry set" onPress={ async _ => {
            const hasRecovery = await PowerAuth.hasBiometryFactor();
            alert(`Biometry factor present: ${hasRecovery}`);
          }} />
          <Button title="Add biometry factor" onPress={ async _ => {
            this.setState({ passPromptVisible: true, passPromptLabel: "Enter password", passPromptCallback: async pass => {
              try {
                const r = await PowerAuth.addBiometryFactor(pass)
                alert(`Biometry factor added`);
              } catch (e) {
                alert(`Failed: ${e.code}`);
                console.log(JSON.stringify(e));
              }
            }})}} />
          <Button title="Remove biometry factor" onPress={ async _ => {
            const result =  await PowerAuth.removeBiometryFactor();
            alert(`Biometry factor removed: ${result}`);
          }} />

          <Text style={styles.titleText}>Recovery</Text>
          <Button title="Has recovery data" onPress={ async _ => {
            const hasRecovery = await PowerAuth.hasActivationRecoveryData();
            alert(`Recovery data present: ${hasRecovery}`);
          }} />
          <Button title="Show recovery data" onPress={e => {
            this.setState({ passPromptVisible: true, passPromptLabel: "Password", passPromptCallback: async pass => {
              try {
                const auth = new PowerAuthAuthentication();
                auth.usePossession = true;
                auth.userPassword = pass;
                auth.useBiometry = false;
                auth.biometryPrompt = "tadaaa";
                const result = await PowerAuth.activationRecoveryData(auth);
                alert(`Code: ${result.recoveryCode}\nPUK: ${result.puk}`);
              } catch (e) {
                alert(`Failed: ${e.code}`);
                console.log(new PowerAuthError(e).print());
              }
            }});
          }} />

          <Text style={styles.titleText}>Other</Text>
          <Button title="Fetch encryption key" onPress={ _ => {
              this.setState({ passPromptVisible: true, passPromptLabel: "Enter password", passPromptCallback: async pass => {
                const auth = new PowerAuthAuthentication();
                auth.usePossession = true;
                auth.userPassword = pass;
                auth.useBiometry = false;
                auth.biometryPrompt = "tadaaa";
                try {
                  const r = await PowerAuth.fetchEncryptionKey(auth,0);
                  alert(`Key: ${r}`);
                } catch (e) {
                  alert(`Failed: ${e.code}`);
                  console.log(JSON.stringify(e));
                }
                await this.refreshActivationInfo();
              } })
          }} />
          <Button title="Test offlineSignature" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Enter password", passPromptCallback: async pass => {
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.userPassword = pass;
            auth.useBiometry = false;
            auth.biometryPrompt = "tadaaa";
            try {
              // TODO: solve this differently, this failes for now as we pass nonsense data
              const r = await PowerAuth.offlineSignature(auth, "test", "body", "nonce");
              alert(`Signature: ${r}`);
            } catch (e) {
              alert(`Remove failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          } }) }} />
          <Button title="Test verifyServerSignedData" onPress={ async _ => {
            // TODO: solve this differently, this failes for now as we pass nonsense data
            const r = await PowerAuth.verifyServerSignedData("data", "signature", true);
            alert(`Verified: ${r}`);
            await this.refreshActivationInfo();
           }} />
          <Button title="Test requestGetSignature" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Enter password", passPromptCallback: async pass => {
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.userPassword = pass;
            auth.useBiometry = false;
            auth.biometryPrompt = "tadaaa";
            try {
              const r = await PowerAuth.requestGetSignature(auth, "test", { testParam: "testvalue" });
              alert(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
            } catch (e) {
              alert(`Remove failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          } }) }} />
          <Button title="Test requestSignature" onPress={ _ => { this.setState({ passPromptVisible: true, passPromptLabel: "Enter password", passPromptCallback: async pass => {
            const auth = new PowerAuthAuthentication();
            auth.usePossession = true;
            auth.userPassword = pass;
            auth.useBiometry = false;
            auth.biometryPrompt = "tadaaa";
            try {
              const r = await PowerAuth.requestSignature(auth, "POST", "tada", "{jsonbody: \"yes\"}")
              alert(`Signature:\nKEY:${r.key}\nVAL:${r.value}`);
            } catch(e) {
              alert(`Remove failed: ${e.code}`);
              console.log(JSON.stringify(e));
            }
            await this.refreshActivationInfo();
          } }) }} />

          <Prompt
              title="Activation"
              placeholder="activation code"
              defaultValue=""
              visible={ this.state.actWithCodePromptVisible }
              onCancel={ () => this.setState({
                actWithCodePromptVisible: false
              }) }
              onSubmit={ (value: string) => {
                this.setState({
                  actWithCodePromptVisible: false
                  });
                this.runCreateActivationWithCode(value);
              }}
          />
          <Prompt
              title={this.state.passPromptLabel}
              placeholder="password"
              defaultValue=""
              visible={ this.state.passPromptVisible }
              onCancel={ () => this.setState({
                passPromptVisible: false
              }) }
              onSubmit={ (value: string) => {
                this.setState({
                  passPromptVisible: false
                  });
                this.state.passPromptCallback(value);
              }}
          />
        </View>
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    marginBottom: 40,
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
