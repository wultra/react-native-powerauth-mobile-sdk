/*
 * Copyright 2026 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Foundation

/// Tests PIN strength. The implementation works directly with the PIN bytes, so the PIN is not copied in memory.
enum PAJSPinTester {

    /// Result of the passcode test that can result in multiple issues.
    struct Result: OptionSet {
        let rawValue: Int
        /// The passcode is OK, no issues found
        static let ok = Result(rawValue: 1 << 0)
        /// The passcode doesn't have enough unique digits
        static let notUnique = Result(rawValue: 1 << 1)
        /// There is a significant amount of repeating characters in the passcode
        static let repeatingChars = Result(rawValue: 1 << 2)
        /// A repeating pattern was found in the passcode
        static let hasPattern = Result(rawValue: 1 << 3)
        /// This passcode can be a date (and possible birthday of the user)
        static let possiblyDate = Result(rawValue: 1 << 4)
        /// The passcode is in most used passcodes
        static let frequentlyUsed = Result(rawValue: 1 << 5)
        /// Wrong input
        static let wrongInput = Result(rawValue: 1 << 6)
    }

    /// Tests the passcode with the given length.
    static func testPasscode(_ pin: UnsafePointer<CChar>, length: Int) -> Result {
        let bytes = UnsafeBufferPointer(start: UnsafeRawPointer(pin).assumingMemoryBound(to: UInt8.self), count: length)
        // Like the C `strlen()`, test only the characters before an embedded NUL.
        let digits = UnsafeBufferPointer(rebasing: bytes.prefix(while: { $0 != 0 }))
        if isInvalidPIN(digits) {
            return .wrongInput
        }
        var result: Result = []
        if isFrequentlyUsed(digits) {
            result.insert(.frequentlyUsed)
        }
        if !isUniqueOK(digits) {
            result.insert(.notUnique)
        }
        if !isPatternOK(digits) {
            result.insert(.hasPattern)
        }
        if !isRepeatingOK(digits) {
            result.insert(.repeatingChars)
        }
        if !isDateOK(digits) {
            result.insert(.possiblyDate)
        }
        return result.isEmpty ? .ok : result
    }

    // MARK: - Private

    private typealias Digits = UnsafeBufferPointer<UInt8>

    /// Maximum acceptable length of the PIN.
    private static let maxPinLength = 100
    /// Minimum PIN length to be able to get reasonable results.
    private static let minPinLength = 4

    private static let digitZero = UInt8(ascii: "0")
    private static let digitNine = UInt8(ascii: "9")

    private static let mostUsedPins: [String] = [
        "1234", "1111", "0000", "1212", "7777", "1004", "2000", "4444", "2222", "6969", "9999", "3333",
        "5555", "6666", "1122", "1313", "8888", "2001", "4321", "1010", "0909", "2580", "0007", "1818",
        "1230", "1984", "1986", "0070", "1985", "0987", "1000", "1231", "1987", "1999", "2468", "2002",
        "2323", "0123", "1123", "1233", "1357", "1221", "1324", "1988", "2112", "2121", "5150", "1024",
        "1112", "1224", "1969", "1225", "1235", "1982", "1983", "1001", "1978", "1979", "7410", "1020",
        "1223", "1974", "1975", "1977", "1980", "1981", "1029", "1121", "1213", "1973", "1976", "2020",
        "2345", "2424", "2525", "1515", "1970", "1972", "1989", "0001", "1023", "1414", "9876", "0101",
        "0907", "1245", "1966", "1967", "1971", "8520", "1964", "1968", "4545", "1318", "5678", "1011",
        "1124", "1211", "1963", "4200", "12345", "123456", "1234567", "12345678", "123456789", "1234567890", "11111", "123123",
        "7777777", "11111111", "987654321", "0123456789", "55555", "111111", "1111111", "88888888", "123123123", "0987654321", "00000", "121212",
        "8675309", "87654321", "789456123", "1111111111", "54321", "123321", "1234321", "00000000", "999999999", "1029384756", "13579", "666666",
        "0000000", "12341234", "147258369", "9876543210", "77777", "000000", "4830033", "69696969", "741852963", "0000000000", "22222", "654321",
        "7654321", "12121212", "111111111", "1357924680", "12321", "696969", "5201314", "11223344", "123454321", "1122334455", "99999", "112233",
        "0123456", "12344321", "123654789", "1234512345", "33333", "159753", "2848048", "77777777", "147852369", "1234554321", "00700", "292513",
        "7005425", "99999999", "111222333", "5555555555", "90210", "131313", "1080413", "22222222", "963852741", "1212121212", "88888", "123654",
        "7895123", "55555555", "321654987", "9999999999", "38317", "222222", "1869510", "33333333", "420420420", "2222222222", "09876", "789456",
        "3223326", "44444444", "007007007", "7777777777", "44444", "999999", "1212123", "66666666", "135792468", "3141592654", "98765", "101010",
        "1478963", "11112222", "397029049", "3333333333", "01234", "777777", "2222222", "13131313", "012345678", "7894561230", "42069", "007007",
        "5555555", "10041004", "123698745", "1234567891"    ]

    /// Compares two slices of the PIN. If `inverted` is set, then the second slice is processed in reverse order.
    private static func slicesEqual(_ digits: Digits, _ start1: Int, _ start2: Int, _ length: Int, inverted: Bool = false) -> Bool {
        for i in 0..<length {
            let index2 = inverted ? start2 + length - i - 1 : start2 + i
            if digits[start1 + i] != digits[index2] {
                return false
            }
        }
        return true
    }

    /// Checks if the year in the date should be considered as a pattern.
    private static func isYearOK(_ year: Int, isShort: Bool) -> Bool {
        // Gregorian year in the local time zone, like C `localtime()`, regardless of the user's calendar.
        let currentYear = Calendar(identifier: .gregorian).component(.year, from: Date())
        var year = year
        // We don't expect future dates, so if year is greater than current, then just assume it's in past.
        if isShort && year > currentYear {
            year -= 100
        }
        // Check if the year is more than the current year on less than current minus 90.
        return year >= currentYear - 90 && year <= currentYear
    }

    /// Parses integer from the PIN. Returns -1 if the PIN is shorter than expected.
    private static func parseInt(_ digits: Digits, _ start: Int, _ size: Int) -> Int {
        guard start + size <= digits.count else {
            return -1
        }
        var value = 0
        for index in start..<(start + size) {
            value = value * 10 + Int(digits[index] - digitZero)
        }
        return value
    }

    /// Parses a year from the PIN. Returns -1 if value is out of expected range.
    private static func parseYear(_ digits: Digits, _ start: Int) -> Int {
        let year = parseInt(digits, start, 4)
        if year < 0 {
            return -1
        }
        return isYearOK(year, isShort: false) ? year : -1
    }

    /// Parses a year in short form from the PIN. Returns -1 if value is out of expected range.
    private static func parseShortYear(_ digits: Digits, _ start: Int) -> Int {
        let shortYear = parseInt(digits, start, 2)
        if shortYear < 0 {
            return -1
        }
        // The "Year 2000: The Millennium Rollover" paper suggests that
        // values in the range 69-99 refer to the twentieth century.
        // Ref: https://sources.debian.org/src/glibc/2.35-2/time/strptime_l.c/#L755
        let year = shortYear >= 69 ? 1900 + shortYear : 2000 + shortYear
        return isYearOK(year, isShort: true) ? year : -1
    }

    /// Parses month from the PIN. Returns -1 if parsed value is not a month.
    private static func parseMonth(_ digits: Digits, _ start: Int) -> Int {
        let month = parseInt(digits, start, 2)
        return month < 1 || month > 12 ? -1 : month
    }

    /// Parses day from the PIN. Returns -1 if parsed value is not a day.
    private static func parseDay(_ digits: Digits, _ start: Int) -> Int {
        let day = parseInt(digits, start, 2)
        return day < 1 || day > 31 ? -1 : day
    }

    /// Determines whether year is a leap year.
    private static func isLeapYear(_ year: Int) -> Bool {
        if year % 4 != 0 {
            // Not divisible by 4, so it's not leap year.
            return false
        }
        if year % 100 != 0 {
            // divisible by 4, but not divisible by 100
            return true
        }
        // If is also divisible by also 400, then it's leap year.
        return year % 400 == 0
    }

    /// Determines whether day in month is OK. If year is -1, then year is not known.
    private static func isDayInMonthOK(_ day: Int, _ month: Int, _ year: Int) -> Bool {
        if day < 1 {
            return false
        }
        switch month {
        case 4, 6, 9, 11:
            return day <= 30
        case 2:
            if year < 0 {
                // If year is not provided, then both variants are valid
                return day <= 29
            }
            return day <= (isLeapYear(year) ? 29 : 28)
        default:
            return day <= 31
        }
    }

    /// Parses the PIN as a date in the chosen format.
    private static func parseDate(_ digits: Digits, _ format: String) -> Bool {
        var year = -1, month = -1, day = -1
        var index = 0
        for component in format {
            if index >= digits.count {
                break
            }
            switch component {
            case "Y":
                year = parseYear(digits, index)
                if year < 0 { return false }
                index += 4
            case "y":
                year = parseShortYear(digits, index)
                if year < 0 { return false }
                index += 2
            case "m":
                month = parseMonth(digits, index)
                if month < 0 { return false }
                index += 2
            case "d":
                day = parseDay(digits, index)
                if day < 0 { return false }
                index += 2
            default:
                return false
            }
        }
        if day > 0 && month > 0 {
            return isDayInMonthOK(day, month, year)
        }
        return true
    }

    /// Calculates how many different digits are in the PIN.
    private static func uniqueDigitsCount(_ digits: Digits) -> Int {
        // The first assumption is that all digits are unique.
        var uniqueDigits = digits.count
        // Verify every digit with the following digits.
        for i in 0..<digits.count {
            for u in (i + 1)..<digits.count where digits[i] == digits[u] {
                // If the same digits are found, mark this digit as not unique
                uniqueDigits -= 1
                break
            }
        }
        return uniqueDigits
    }

    /// Tests if given PIN has enough unique digits inside. For example, 1122 contains only 2 unique digits.
    private static func isUniqueOK(_ digits: Digits) -> Bool {
        // For length to 7 digits, consider 3 unique OK. 4 unique for longer pins.
        return uniqueDigitsCount(digits) >= (digits.count <= 7 ? 3 : 4)
    }

    /// Searches for repeating digits in the PIN. For example, 692692 is repeating.
    private static func isRepeatingOK(_ digits: Digits) -> Bool {
        let pinLength = digits.count
        var digitsRepeating = 0 // how many digits were found that are in patterns
        var groupsTested = [(start: Int, length: Int)]()
        // this is the biggest length of a possible repeating pattern
        let maxLength = pinLength / 2
        // start searching for patterns with various lengths
        var length = 2
        while length <= maxLength {
            // start searching for parts of the pin that could be repeated
            var start = 0
            while start + length <= pinLength - length {
                // check if this group was already tested, if so, skip it
                if groupsTested.contains(where: { $0.length == length && slicesEqual(digits, start, $0.start, length) }) {
                    break
                }
                // remember the group as tested
                if groupsTested.count >= maxPinLength / 2 {
                    return false
                }
                groupsTested.append((start, length))
                var lastRepeatingFound = false
                // now start moving after the first group to search for repeating patterns
                var searchStart = start + length
                while searchStart + length <= pinLength {
                    // check if the two groups are equal, also in inverted order to match {1,2,3,2,1}
                    if slicesEqual(digits, start, searchStart, length) || slicesEqual(digits, start, searchStart, length, inverted: true) {
                        // we found a repeating pattern! save how many digits are part of this pattern
                        digitsRepeating += length
                        // move searchStart behind this pattern we just found
                        searchStart += length
                        lastRepeatingFound = true
                    } else {
                        searchStart += 1 // continue searching
                    }
                }
                if lastRepeatingFound {
                    digitsRepeating += length
                    start += length
                } else {
                    start += 1
                }
            }
            length += 1
        }
        return digitsRepeating <= uniqueDigitsCount(digits)
    }

    /// Searches for patterns in the PIN. Patterns can be 1234, 3579, 5331, 2580, ...
    private static func isPatternOK(_ digits: Digits) -> Bool {
        let pinLength = digits.count
        var totalSequence = 0
        // start searching for a pattern for where each digit can be the start of the pattern
        // search to pinLength-2, because the pattern needs to be at least 3 digits long
        var index = 0
        while index < pinLength - 2 {
            // next number in the pattern. Adding 2 here to skip the first following.
            // 2 numbers cannot be a pattern, they just set how big the 'gap' in the pattern is
            var following = index + 2
            var sequence = 0 // how many numbers are involved in the pattern
            var repeating = 0 // when the number in the pattern is repeated (like 4556)
            let shift = Int(digits[index + 1]) - Int(digits[index]) // the gap between two digits of the pattern
            while following < pinLength {
                let current = Int(digits[following])
                let previous = Int(digits[following - 1])
                if current - previous == shift {
                    // if we found the first number in the pattern, add 3 as the minimum length for the pattern
                    sequence += sequence == 0 ? 3 : 1
                } else if current == previous {
                    // if the number is the same as previous, add it to patten too
                    repeating += 1
                } else {
                    break // stop if the pattern is broken
                }
                following += 1
            }
            if sequence != 0 {
                sequence += repeating
            }
            // if the sequence was found (minimum sequence length is 3)
            if sequence >= 3 {
                index = following + 1 // move past the sequence
                totalSequence += sequence // add to total sequence count
            } else {
                index += 1
            }
        }
        if pinLength <= 5 {
            return totalSequence <= 2
        } else if pinLength <= 6 {
            return totalSequence <= 3
        } else if pinLength <= 8 {
            return totalSequence <= 4
        } else {
            return totalSequence <= pinLength / 2
        }
    }

    /// Checks, if the PIN could be a date in various formats: mmdd, ddmm, mmddyy, ddmmyy, mmddyyyy, ddmmyyyy, yyyy.
    private static func isDateOK(_ digits: Digits) -> Bool {
        // only check for pins with even length
        switch digits.count {
        case 4:
            // If the PIN could be date like 0304 (3rd of April or 4th of March)
            // If the PIN could be valid year (like 1982), that could be year of birth
            return !(parseDate(digits, "dm") || parseDate(digits, "md") || parseDate(digits, "Y"))
        case 6:
            // If the PIN could be a date with a year (like 121091 that could be 12th of October or 10th of December 1991)
            return !(parseDate(digits, "dmy") || parseDate(digits, "mdy"))
        case 8:
            // If the PIN could be a date with a year (like 12101991 that could be 12th of October or 10th of December 1991)
            return !(parseDate(digits, "dmY") || parseDate(digits, "mdY"))
        default:
            return true
        }
    }

    /// Determines if the PIN is among the most used ones.
    private static func isFrequentlyUsed(_ digits: Digits) -> Bool {
        return mostUsedPins.contains { $0.utf8.elementsEqual(digits) }
    }

    /// Validates whether the PIN contains only digits and is within the length limits.
    private static func isInvalidPIN(_ digits: Digits) -> Bool {
        if digits.count > maxPinLength || digits.count < minPinLength {
            return true
        }
        return digits.contains { $0 < digitZero || $0 > digitNine }
    }
}
