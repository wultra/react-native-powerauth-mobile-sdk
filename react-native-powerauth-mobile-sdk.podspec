require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-powerauth-mobile-sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = "PowerAuth SDK for React Native Mobile Apps"
  s.homepage     = "https://github.com/wultra/react-native-powerauth-mobile-sdk"
  s.license      = "Apache 2.0"
  s.authors      = { "Wultra s.r.o" => "support@wultra.com" }
  s.platforms    = { :ios => "8.0" }
  s.source       = { :git => "https://github.com/wultra/react-native-powerauth-mobile-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/PowerAuth/*.{h,m}"
  s.requires_arc = true

  s.dependency "React"
  s.dependency "PowerAuth2", "1.4.1"
end
