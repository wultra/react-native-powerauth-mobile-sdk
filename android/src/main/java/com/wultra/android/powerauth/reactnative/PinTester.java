/*
 * Copyright 2022 Wultra s.r.o.
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

package com.wultra.android.powerauth.reactnative;

import java.util.Calendar;

import androidx.annotation.NonNull;

/**
 * The {@code PinTester} class implements PIN strength validation. The implementation is based on
 * <a href="https://github.com/wultra/passphrase-meter">Wultra's passphrase meter</a> library.
 */
class PinTester {

    /**
     * Current year.
     */
    private final int currentYear;

    PinTester() {
        this.currentYear = Calendar.getInstance().get(Calendar.YEAR);
    }

    static final int PIN_MIN_LENGTH         = 4;
    static final int PIN_MAX_LENGTH         = 100;

    static final int RES_OK                 = 0;

    static final int RES_NOT_UNIQUE         = 0x001;
    static final int RES_REPEATING_CHARS    = 0x002;
    static final int RES_HAS_PATTERN        = 0x004;
    static final int RES_POSSIBLY_DATE      = 0x008;
    static final int RES_FREQUENTLY_USED    = 0x010;

    static final int RES_WRONG_INPUT        = 0x100;
    static final int RES_TOO_SHORT          = 0x200;

    /**
     * Test strength of provided PIN.
     * @param pin PIN to test.
     * @return Combination of RES_* constants.
     */
    int testPin(@NonNull byte[] pin) {
        int result = isValidPIN(pin);
        if (result != RES_OK) {
            return result;
        }
        if (isFrequentlyUsed(pin)) {
            result |= RES_FREQUENTLY_USED;
        }
        if (!isUniqueOK(pin)) {
            result |= RES_NOT_UNIQUE;
        }
        if (!isRepeatingOK(pin)) {
            result |= RES_REPEATING_CHARS;
        }
        if (!isPatternOK(pin)) {
            result |= RES_HAS_PATTERN;
        }
        if (!isDateOK(pin)) {
            result |= RES_POSSIBLY_DATE;
        }
        return result;
    }

    /**
     * Test whether byte array contains only digits and has a right length.
     * @param pin PIN to test.
     * @return RES_OK if PIN is valid, otherwise RES_* error code.
     */
    private int isValidPIN(byte[] pin) {
        if (pin == null) {
            return RES_WRONG_INPUT;
        }
        if (pin.length < PIN_MIN_LENGTH) {
            return RES_TOO_SHORT;
        }
        if (pin.length > PIN_MAX_LENGTH) {
            return RES_WRONG_INPUT;
        }
        for (byte b : pin) {
            if (b < '0' || b > '9') {
                return RES_WRONG_INPUT;
            }
        }
        return RES_OK;
    }

    // Frequently used

    private static final String[] mostUsedPins = {
        "1234", "1111", "0000", "1212", "7777", "1004", "2000", "4444", "2222", "6969", "9999", "3333", "5555", "6666", "1122", "1313", "8888",
        "2001", "4321", "1010", "0909", "2580", "0007", "1818", "1230", "1984", "1986", "0070", "1985", "0987", "1000", "1231", "1987", "1999",
        "2468", "2002", "2323", "0123", "1123", "1233", "1357", "1221", "1324", "1988", "2112", "2121", "5150", "1024", "1112", "1224", "1969",
        "1225", "1235", "1982", "1983", "1001", "1978", "1979", "7410", "1020", "1223", "1974", "1975", "1977", "1980", "1981", "1029", "1121",
        "1213", "1973", "1976", "2020", "2345", "2424", "2525", "1515", "1970", "1972", "1989", "0001", "1023", "1414", "9876", "0101", "0907",
        "1245", "1966", "1967", "1971", "8520", "1964", "1968", "4545", "1318", "5678", "1011", "1124", "1211", "1963", "4200",

        "12345", "123456", "1234567", "12345678", "123456789", "1234567890", "11111", "123123", "7777777", "11111111", "987654321",
        "0123456789", "55555", "111111", "1111111", "88888888", "123123123", "0987654321", "00000", "121212", "8675309", "87654321",
        "789456123", "1111111111", "54321", "123321", "1234321", "00000000", "999999999", "1029384756", "13579", "666666", "0000000",
        "12341234", "147258369", "9876543210", "77777", "000000", "4830033", "69696969", "741852963", "0000000000", "22222", "654321",
        "7654321", "12121212", "111111111", "1357924680", "12321", "696969", "5201314", "11223344", "123454321", "1122334455", "99999",
        "112233", "0123456", "12344321", "123654789", "1234512345", "33333", "159753", "2848048", "77777777", "147852369", "1234554321",
        "00700", "292513", "7005425", "99999999", "111222333", "5555555555", "90210", "131313", "1080413", "22222222", "963852741",
        "1212121212", "88888", "123654", "7895123", "55555555", "321654987", "9999999999", "38317", "222222", "1869510", "33333333",
        "420420420", "2222222222", "09876", "789456", "3223326", "44444444", "007007007", "7777777777", "44444", "999999", "1212123",
        "66666666", "135792468", "3141592654", "98765", "101010", "1478963", "11112222", "397029049", "3333333333", "01234", "777777",
        "2222222", "13131313", "012345678", "7894561230", "42069", "007007", "5555555", "10041004", "123698745", "1234567891"
    };

    /**
     * Test if the PIN is among the most used ones.
     * @param pin PIN to test.
     * @return true if PIN is frequently used.
     */
    private boolean isFrequentlyUsed(@NonNull byte[] pin) {
        for (String s: mostUsedPins) {
            if (compareStrPin(pin, s)) {
                return true;
            }
        }
        return false;
    }

    // Not unique

    /**
     * Test if given pin has enough unique digits inside.
     * For example for pin 1122 returns false, it only contains 2 unique digits.
     * @param pin PIN to test.
     * @return true if the are enough unique digits.
     */
    private boolean isUniqueOK(@NonNull byte[] pin) {
        return uniqueDigitsCount(pin) >= (pin.length <= 7 ? 3 : 4);
    }

    /**
     * Calculates how many different digits are in the array.
     * For example in array {1,5,6,5} there are 3 unique integer 1,5,6.
     * @param pin PIN to test.
     * @return Number of unique digits in PIN.
     */
    private int uniqueDigitsCount(@NonNull byte[] pin) {
        final int digitsCount = pin.length;
        // The first assumption is that all digits are unique.
        int uniqueDigits = digitsCount;
        // Verify every digit with the following digits.
        for (int i = 0; i < digitsCount; i++) {
            for (int u = i + 1; u < digitsCount; u++) {
                // If the same digits are found, mark this digit as not unique
                if (pin[i] == pin[u]) {
                    uniqueDigits--;
                    break;
                }
            }
        }
        return uniqueDigits;
    }

    // Repeating chars

    /**
     * Searches for repeating digits in the pin. For example, 692692 is repeating.
     * @param pin PIN to test.
     * @return true if there are enough unique digits.
     */
    private boolean isRepeatingOK(@NonNull byte[] pin) {
        // this is the biggest length of a possible repeating pattern
        final int maxLength = pin.length / 2;

        // How many groups can be tested
        final int maxGroups = PIN_MAX_LENGTH / 2;

        // how many digits were found that are in patterns
        int digitsRepeating = 0;

        // groups that were tested
        int groupsTestedCount = 0;
        final Range[] groupsTested = new Range[maxGroups];

        // start searching for patterns with various lengths
        for (int length = 2; length <= maxLength; length++) {

            // start searching for parts of the pin that could be repeated
            // following comments will be explaining searching in pin "12312" for length 2
            int start = 0;
            while (start + length <= pin.length - length) {
                boolean groupWasTested = false;
                // check if this group was already tested
                for (int group = 0; group < groupsTestedCount; group++) {

                    // if the group was already tested, skip it
                    if (groupsTested[group].length == length && arrayEquals(pin, start, pin, groupsTested[group].start, length)) {
                        groupWasTested = true;
                        break;
                    }
                }
                if (groupWasTested) {
                    break;
                }
                // remember the group as tested
                if (groupsTestedCount >= maxGroups) {
                    return false;
                }
                groupsTested[groupsTestedCount] = new Range(start, length);
                groupsTestedCount++;

                boolean lastRepeatingFound = false;

                // now start moving after the first group to search for repeating patterns
                int searchStart = start + length;
                while (searchStart + length <= pin.length) {
                    // now check if the two groups are equals
                    // for the first loop {3,1}, they won't. for second {1,2}, they will. Also, we're checking for inverted order of the second group to potentially match {1,2,3,2,1}
                    if (arrayEquals(pin, start, pin, searchStart, length) || arrayEqualsInv(pin, start, pin, searchStart, length)) {
                        // we found a repeating pattern! save how many digits are part of this pattern
                        digitsRepeating += length;
                        // move searchStart behind this pattern we just found
                        searchStart = searchStart + length;
                        // mark as found
                        lastRepeatingFound = true;
                    } else {
                        searchStart++; // continue searching
                    }
                }
                if (lastRepeatingFound) {
                    digitsRepeating += length;
                    start += length;
                } else {
                    start++;
                }
            }
        }

        return digitsRepeating <= uniqueDigitsCount(pin);
    }

    private static class Range {
        final int start;
        final int length;
        Range(int start, int length) {
            this.start = start;
            this.length = length;
        }
    }


    // Pattern

    /**
     * Searches for patterns in the pin. Patterns can be 1234, 3579, 5331, 2580, ...
     * @param pin PIN to test.
     * @return true if no patters were found.
     */
    private boolean isPatternOK(@NonNull byte[] pin) {
        final int pinLength = pin.length;
        int totalSequence = 0;

        // start searching for a pattern for where each digit can be the start of the pattern
        // search to pinLength-2, because the pattern needs to be at least 3 digits long
        int index = 0;
        while (index < pinLength-2) {

            // next number in the pattern. Adding 2 here to skip the first following.
            // 2 numbers cannot be a pattern, they just set how big the 'gap' in the pattern is
            int following = index + 2;
            int sequence = 0; // how many numbers are involved in the pattern
            int repeating = 0; // when the number in the pattern is repeated (like 4556)

            int shift = pin[index + 1] - pin[index]; // the gap between two digits of the pattern (it will be 4 for 1,5,9)

            while (following < pinLength) {
                // if the third, fourth, ... number has the same gap, it's a pattern
                if (pin[following] - pin[following - 1] == shift) {
                    // if we found the first number in the pattern, add 3 as the minimum length for the pattern
                    sequence += sequence == 0 ? 3 : 1;
                    // if the number is the same as previous, add it to patten too
                } else if (pin[following] == pin[following - 1]) {
                    repeating++;
                } else {
                    break; // stop if the pattern is broken
                }

                following++;
            }

            if (sequence != 0) {
                sequence += repeating;
            }

            // if the sequence was found (minimum sequence length is 3)
            if (sequence >= 3) {
                index = following + 1; // move past the sequence
                totalSequence += sequence; // add to total sequence count
            } else {
                index++;
            }
        }
        if (pinLength <= 5) {
            return totalSequence <= 2;
        } else if (pinLength <= 6) {
            return totalSequence <= 3;
        } else if (pinLength <= 8) {
            return totalSequence <= 4;
        } else {
            return totalSequence <= pinLength / 2;
        }
    }

    // Date

    /**
     * Checks, if the pin could be a date in various formats.
     * This check should be presented to the user only as a mild warning,
     * for example: "This pin looks like a date, is it your birthday?"
     *
     * It checks following formats: "mmdd", "ddmm", "mmddyy", "ddmmyy", "mmddyyyy", "ddmmyyyy", "yyyy".
     * For years, it only checks years between CURRENTYEAR - 80
     *
     * @param pin PIN to test.
     * @return true if PIN is not a date.
     */
    private boolean isDateOK(@NonNull byte[] pin) {
        switch (pin.length) {
            case 4:
                // If the PIN could be date like 0304 (3rd of April or 4th of March)
                // If the PIN could be valid year (like 1982), that could be year of birth
                return !(parseDate(pin, "dm") || parseDate(pin, "md") || parseDate(pin, "Y"));
            case 6:
                // If the PIN could be a date with a year (like 121091 that could be 12th of October or 10th of December 1991)
                return !(parseDate(pin, "dmy") || parseDate(pin, "mdy"));
            case 8:
                // If the PIN could be a date with a year (like 12101991 that could be 12th of October or 10th of December 1991)
                return !(parseDate(pin, "dmY") || parseDate(pin, "mdY"));
            default:
                return true;
        }
    }

    /**
     * Simple date parser. The supported date format is:
     * - "Y" - long year (e.g. 2021)
     * - "y" - short year (e.g. 21)
     * - "m" - month (01 ... 12)
     * - "d" - day (01 ... 31)
     * @param pin PIN to parse as date.
     * @param format Format of the date.
     * @return true if date was properly parsed.
     */
    private boolean parseDate(@NonNull byte[] pin, @NonNull String format) {
        int year = -1;
        int month = -1;
        int day = -1;

        int pinIndex = 0;
        for (int i = 0; i < format.length() && pinIndex < pin.length; ++i) {
            switch (format.charAt(i)) {
                case 'Y':
                    year = parseYear(pin, pinIndex);
                    if (year < 0) {
                        return false;
                    }
                    pinIndex += 4;
                    break;
                case 'y':
                    year = parseShortYear(pin, pinIndex);
                    if (year < 0) {
                        return false;
                    }
                    pinIndex += 2;
                    break;
                case 'm':
                    month = parseMonth(pin, pinIndex);
                    if (month < 0) {
                        return false;
                    }
                    pinIndex += 2;
                    break;
                case 'd':
                    day = parseDay(pin, pinIndex);
                    if (day < 0) {
                        return false;
                    }
                    pinIndex += 2;
                    break;
                default:
                    throw new IllegalArgumentException("Invalid format: " + format);
            }
        }
        if (pinIndex != pin.length) {
            throw new IllegalStateException("Some digits are ignored");
        }
        if (day > 0 && month > 0) {
            return isDayInMonthOK(day, month, year);
        }
        return true;
    }

    // Utilities

    /**
     * Parse month from PIN.
     * @param pin Input PIN.
     * @param start Start index where month begins.
     * @return Parsed month or -1 if parsed value is not a month.
     */
    private int parseMonth(@NonNull byte[] pin, int start) {
        int m = parseInt(pin, start, 2);
        if (m < 1 || m > 12) {
            return -1;
        }
        return m;
    }

    /**
     * Parse day from PIN.
     * @param pin Input PIN.
     * @param start Start index where day begins.
     * @return Parsed day or -1 if parsed value is not a day.
     */
    private int parseDay(@NonNull byte[] pin, int start) {
        int d = parseInt(pin, start, 2);
        if (d < 1 || d > 31) {
            return -1;
        }
        return d;
    }

    /**
     * Parse a year from PIN.
     * @param pin Input PIN.
     * @param start Start index where year begins.
     * @return Parsed year or -1 if value is out of expected range.
     */
    private int parseYear(@NonNull byte[] pin, int start) {
        int year = parseInt(pin, start, 4);
        return isYearOk(year) ? year : -1;
    }

    /**
     * Parse a year in short form from PIN.
     * @param pin Input PIN.
     * @param start Start index where year begins.
     * @return Parsed year or -1 if value is out of expected range.
     */
    private int parseShortYear(@NonNull byte[] pin, int start) {
        int shortYear = parseInt(pin, start, 2);
        // The "Year 2000: The Millennium Rollover" paper suggests that
	    // values in the range 69-99 refer to the twentieth century.
        // Ref: https://sources.debian.org/src/glibc/2.35-2/time/strptime_l.c/#L755
        int year = shortYear >= 69 ? 1900 + shortYear : 2000 + shortYear;
        // We don't expect future dates, so if year is greater than current, then just assume it's in
        // past. This sould match the iOS behavior.
        if (year > currentYear) {
            year -= 100;
        }
        return isYearOk(year) ? year : -1;
    }

    /**
     * Determine whether year is in range {@code <current - 90, current>}.
     * @param year Year to test.
     * @return true if year is within the expected rage.
     */
    private boolean isYearOk(int year) {
        return year >= currentYear - 90 && year <= currentYear;
    }

    /**
     * Determine whether day in month is OK.
     * @param day Day in month to test.
     * @param month Month to test.
     * @param year Year, if -1, then year is not known.
     * @return true if day in month is withing accepted range.
     */
    private boolean isDayInMonthOK(int day, int month, int year) {
        if (day < 1) {
            return false;
        }
        switch (month) {
            case 4:  // april
            case 6:  // june
            case 9:  // september
            case 11: // november
                return day <= 30;

            case 2: // feb
                if (year < 0) {
                    // If year is not provided, then both variants are valid
                    return day <= 29;
                }
                return day <= (isLeapYear(year) ? 29 : 28);

            default:
                return day <= 31;

        }
    }

    /**
     * Determine whether year is a leap year.
     * @param year Year to test.
     * @return true if year is a leap year.
     */
    private boolean isLeapYear(int year) {
        if (year % 4 != 0) {
            // Not divisible by 4, so it's not leap year.
            return false;
        }
        if (year % 100 != 0) {
            // divisible by 4, but not divisible by 100
            return true;
        }
        // If is also divisible by also 400, then it's leap year.
        return (year % 400) == 0;
    }

    /**
     * Parse integer from PIN.
     * @param pin PIN to parse as integer.
     * @param start Start index.
     * @param size Lenght of characters.
     * @return Integer parsed from PIN.
     */
    private int parseInt(@NonNull byte[] pin, int start, int size) {
        if (start + size > pin.length) {
            throw new IllegalArgumentException("parseInt params out of range");
        }
        int value = 0;
        for (int i = start; i < start + size; i++) {
            int digit = pin[i] - '0';
            value = value * 10 + digit;
        }
        return value;
    }

    /**
     * Compare two PIN, one in byte array form and second as string.
     * @param a PIN in form of array of bytes.
     * @param b PIN in string form.
     * @return true if both PINs are equal.
     */
    private boolean compareStrPin(byte[] a, String b) {
        if (a.length != b.length()) {
            return false;
        }
        for (int i = 0; i < a.length; ++i) {
            if (b.charAt(i) != a[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Compare two regions with the same length in two byte arrays.
     * @param ar1 Array 1.
     * @param ar1start Start index in array 1.
     * @param ar2 Array 2.
     * @param ar2start Start index in array 2.
     * @param length Length of both regions to compare.
     * @return true if both regions are equal.
     */
    private boolean arrayEquals(@NonNull byte[] ar1, int ar1start, @NonNull byte[] ar2, int ar2start, int length) {
        for (int i = 0; i < length; i++) {
            int ar2Index = ar2start + i;
            if (ar1[ar1start + i] != ar2[ar2Index]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Compare two regions with the same length in two byte arrays. The 2nd array is processed in reverse order.
     * @param ar1 Array 1.
     * @param ar1start Start index in array 1.
     * @param ar2 Array 2.
     * @param ar2start Start index in array 2.
     * @param length Length of both regions to compare.
     * @return true if both regions are equal.
     */
    private boolean arrayEqualsInv(@NonNull byte[] ar1, int ar1start, @NonNull byte[] ar2, int ar2start, int length) {
        for (int i = 0; i < length; i++) {
            int ar2Index = ar2start + length - i - 1;
            if (ar1[ar1start + i] != ar2[ar2Index]) {
                return false;
            }
        }
        return true;
    }
}
