require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = package["name"]
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license "]
  s.authors      = { package["author"]["name"] => package["author"]["email"] }
  s.platforms    = { :ios => "8.0" }
  s.source       = { :git => "https://github.com/wultra/react-native-powerauth-mobile-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/PowerAuth/*.{h,m}"
  s.requires_arc = true

  s.dependency "React"
  s.dependency "PowerAuth2", "1.5.4"
end
