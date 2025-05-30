//
//  String.swift
//  bc-services-card
//
//  Created by Spencer Mandrusiak on 2017-09-07.
//  Copyright © Province of British Columbia. All rights reserved.
//

import UIKit
import Foundation

extension String {
    
    var isValidPostalCode: Bool {
        let regex = "[ABCEGHJKLMNPRSTVXY][0-9][ABCEGHJKLMNPRSTVWXYZ] ?[0-9][ABCEGHJKLMNPRSTVWXYZ][0-9]"
        return isValidFor(regex: regex)
    }
    
    var isValidCSN: Bool {
        let regex = "^[A-Za-z0-9]{3,15}$"
        return isValidFor(regex: regex)
    }
    
    var isValidName: Bool {
        let regex = "^[a-zA-Z]+[ a-zA-Z0-9'.-]*$"
        return isValidFor(regex: regex)
    }
    
    var isValidLetter: Bool {
        let regex = "^[a-zA-Z]*$"
        return isValidFor(regex: regex)
    }
    
    var isValidEmail: Bool {
       let emailRegEx = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,20}"
       let emailTest  = NSPredicate(format:"SELF MATCHES %@", emailRegEx)
        return emailTest.evaluate(with: self)
    }
    
    var firstCharacterIsValidLetter: Bool {
        return String(self.prefix(1)).isValidLetter
    }
    
    func isValidFor(regex:String) -> Bool{
        return self.range(of: regex, options: .regularExpression) != nil
    }
    
    func condenseWhitespace() -> String {
        let components = self.components(separatedBy: .whitespacesAndNewlines)
        return components.filter { !$0.isEmpty }.joined(separator: " ")
    }
    
    var trimmingTrailingSpaces: String {
        if let range = rangeOfCharacter(from: .whitespacesAndNewlines, options: [.anchored, .backwards]) {
            return String(self[..<range.lowerBound]).trimmingTrailingSpaces
        }
        return self
    }

    func boldPartsOfString(fontSize: CGFloat, boldWords: [String]) -> NSMutableAttributedString {
        let attributedString:NSMutableAttributedString = NSMutableAttributedString(string: self)
        let firstAttributes = [NSAttributedString.Key.font: UIFont.boldSystemFont(ofSize: fontSize)]
        for i in 0 ..< boldWords.count {
            attributedString.addAttributes(firstAttributes, range: (self as NSString).range(of: boldWords[i]))
        }
        return attributedString
    }
    
    func addBoldTextTo(boldPartsOfString: Array<String>,
                       font: UIFont,
                       boldFont: UIFont) -> NSAttributedString {
        let nonBoldFontAttribute = [NSAttributedString.Key.font: font] as [NSAttributedString.Key : Any]
        let boldFontAttribute = [NSAttributedString.Key.font: boldFont] as [NSAttributedString.Key : Any]
        let boldString = NSMutableAttributedString(string: self, attributes: nonBoldFontAttribute)
        for i in 0 ..< boldPartsOfString.count {
            boldString.addAttributes(boldFontAttribute, range: (self as NSString).range(of: boldPartsOfString[i]))
        }
        return boldString
    }
    
    static func ~= (lhs: String, rhs: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: rhs) else { return false }
        let range = NSRange(location: 0, length: lhs.utf16.count)
        return regex.firstMatch(in: lhs, options: [], range: range) != nil
    }
    
    func stringByReplacingFirstOccurrenceOfString(
            target: String, withString replaceString: String) -> String {
        if let range = self.range(of: target) {
            return self.replacingCharacters(in: range, with: replaceString)
        }
        return self
    }
    
    func trim() -> String {
        return self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    func containsUUID() -> Bool {
        let uuidRegex = "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
        
        do {
            let regex = try NSRegularExpression(pattern: uuidRegex, options: .caseInsensitive)
            let range = NSRange(location: 0, length: self.utf16.count)
            if let _ = regex.firstMatch(in: self, options: [], range: range) {
                return true
            } else {
                return false
            }
        } catch {
            return false
        }
    }
    
    func versionCompare(_ other: String) -> ComparisonResult {
        let delimiter = "."

        var components = self.components(separatedBy: delimiter)
        var otherComponents = other.components(separatedBy: delimiter)

        let zeroDiff = components.count - otherComponents.count

        if zeroDiff == 0 {
            return self.compare(other, options: .numeric)
        } else {
            let zeros = Array(repeating: "0", count: abs(zeroDiff))
            if zeroDiff > 0 {
                otherComponents.append(contentsOf: zeros)
            } else {
                components.append(contentsOf: zeros)
            }
            return components.joined(separator: delimiter)
                .compare(otherComponents.joined(separator: delimiter), options: .numeric)
        }
    }
}

extension StringProtocol {
    var firstUppercased: String {
        guard let first = first else { return "" }
        return String(first).uppercased() + dropFirst()
    }
    var firstCapitalized: String {
        guard let first = first else { return "" }
        return String(first).capitalized + dropFirst()
    }
}

extension String {
    
    func convertFrom24HourTo12Hour() -> String {
        let split = components(separatedBy: ":")
        guard split.count == 2 else {
            return ""
        }
        
        let hour = Int(split[0]) ?? -1
        let minute = Int(split[1]) ?? -1
        
        guard 0 <= hour, hour <= 23, 0 <= minute, minute <= 59 else {
            return ""
        }
        
        let suffix = hour > 11 ? "pm" : "am"
        
        var adjustment: Int = 0
        if hour == 0 {
            adjustment = 12
        } else if (hour > 12) {
            adjustment = -12
        }
        
        return String(format: "%d:%02d\(suffix)", hour + adjustment, minute)
    }
    
}

extension String? {
    /// Return unwrapped string only if string is not empty
    var nonEmptyUnwrapped: String? {
        if let unwrappedSelf = self, unwrappedSelf.trim() != "" {
            return unwrappedSelf
        }
        
        return nil
    }
}

extension String {
    func subString(startIndex: Int, endIndex: Int) -> String{
        var subStrStart : String.Index
        if startIndex < 0 {
            subStrStart = self.index(self.startIndex, offsetBy: 0)
        } else {
            subStrStart = self.index(self.startIndex, offsetBy: startIndex)
        }
        
        var subStrEnd : String.Index
        if endIndex > self.count {
            subStrEnd = self.index(self.startIndex, offsetBy: self.count - 1)
        } else {
            subStrEnd = self.index(self.startIndex, offsetBy: endIndex)
        }
        
        return String(self[subStrStart..<subStrEnd])
    }
    
    func subString(startIndex: Int) -> String{
        let subStrStart : String.Index
        if startIndex > self.count {
            subStrStart = self.index(self.startIndex, offsetBy: self.count - 1)
        } else {
            subStrStart = self.index(self.startIndex, offsetBy: startIndex)
        }
        return String(self[subStrStart..<self.endIndex])
    }
}
