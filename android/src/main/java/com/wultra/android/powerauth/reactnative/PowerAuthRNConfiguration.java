package com.wultra.android.powerauth.reactnative;

class PowerAuthRNConfiguration {

    private String mInstanceId;
    private String mAppKey;
    private String mAppSecret;
    private String mMasterServerPublicKey;
    private String mBaseEndpointUrl;
    private boolean mEnableUnsecureTraffic;

    PowerAuthRNConfiguration(String instanceId, String appKey, String appSecret, String masterServerPublicKey, String baseEndpointUrl, boolean enableUnsecureTraffic) {
        this.mInstanceId = instanceId;
        this.mAppKey = appKey;
        this.mAppSecret = appSecret;
        this.mMasterServerPublicKey = masterServerPublicKey;
        this.mBaseEndpointUrl = baseEndpointUrl;
        this.mEnableUnsecureTraffic = enableUnsecureTraffic;
    }

    String getInstanceId() {
        return mInstanceId;
    }

    String getAppKey() {
        return mAppKey;
    }

    String getAppSecret() {
        return mAppSecret;
    }

    String getMasterServerPublicKey() {
        return mMasterServerPublicKey;
    }

    String getBaseEndpointUrl() {
        return mBaseEndpointUrl;
    }

    boolean isEnableUnsecureTraffic() {
        return mEnableUnsecureTraffic;
    }
}
