//
//  AccountSecurityMethod.swift
//  bcsc-core
//

import Foundation

enum AccountSecurityMethod: String {
  case pinNoDeviceAuth = "app_pin_no_device_authn"
  case pinWithDeviceAuth = "app_pin_has_device_authn"
  case deviceAuth = "device_authentication"
}
