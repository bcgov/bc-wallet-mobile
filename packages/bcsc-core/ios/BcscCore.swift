import Foundation
import React

@objcMembers
@objc(BcscCore)
class BcscCore: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func multiply(_ a: Double, b: Double, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) {
    let result = NSNumber(value: a * b)
    resolve(result)
  }
  
  @objc
  func multiply2(_ a: Double, b: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let result = NSNumber(value: a * b)
    resolve(result)
  }
  
  // Support for the new architecture (Fabric)
  #if RCT_NEW_ARCH_ENABLED
  @objc
  class func moduleName() -> String! {
    return "BcscCore"
  }
  #endif
}