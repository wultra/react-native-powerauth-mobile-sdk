/**
 * Copyright 2018 Wultra s.r.o.
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

#include "pin_tester.h"
#include <stdlib.h>
#include <time.h>
#include <ctype.h>
#include <string.h>

#pragma mark - PRIVATE

/**
 Defines the maximum acceptable length of the PIN. We need this constant to limit buffers, created on the stack.
 */
#define MAX_PIN_LENGTH 100

/**
 Minimum PIN length to be able to get reasonable results.
 */
#define MIN_PIN_LENGTH 4

static const char* mostUsedPin[] =
{
    "1234","1111","0000","1212","7777","1004","2000","4444","2222","6969","9999","3333","5555","6666","1122","1313","8888",
    "2001","4321","1010","0909","2580","0007","1818","1230","1984","1986","0070","1985","0987","1000","1231","1987","1999",
    "2468","2002","2323","0123","1123","1233","1357","1221","1324","1988","2112","2121","5150","1024","1112","1224","1969",
    "1225","1235","1982","1983","1001","1978","1979","7410","1020","1223","1974","1975","1977","1980","1981","1029","1121",
    "1213","1973","1976","2020","2345","2424","2525","1515","1970","1972","1989","0001","1023","1414","9876","0101","0907",
    "1245","1966","1967","1971","8520","1964","1968","4545","1318","5678","1011","1124","1211","1963","4200",
    
    "12345","123456","1234567","12345678","123456789","1234567890","11111","123123","7777777","11111111","987654321",
    "0123456789","55555","111111","1111111","88888888","123123123","0987654321","00000","121212","8675309","87654321",
    "789456123","1111111111","54321","123321","1234321","00000000","999999999","1029384756","13579","666666","0000000",
    "12341234","147258369","9876543210","77777","000000","4830033","69696969","741852963","0000000000","22222","654321",
    "7654321","12121212","111111111","1357924680","12321","696969","5201314","11223344","123454321","1122334455","99999",
    "112233","0123456","12344321","123654789","1234512345","33333","159753","2848048","77777777","147852369","1234554321",
    "00700","292513","7005425","99999999","111222333","5555555555","90210","131313","1080413","22222222","963852741",
    "1212121212","88888","123654","7895123","55555555","321654987","9999999999","38317","222222","1869510","33333333",
    "420420420","2222222222","09876","789456","3223326","44444444","007007007","7777777777","44444","999999","1212123",
    "66666666","135792468","3141592654","98765","101010","1478963","11112222","397029049","3333333333","01234","777777",
    "2222222","13131313","012345678","7894561230","42069","007007","5555555","10041004","123698745","1234567891"
};

/**
 Takes 2 integer arrays and compares each element between them from different starting points.
 
 @param ar1 Array with numbers
 @param ar1start Index where the beginning of the compared part should be
 @param ar2 Array with numbers
 @param ar2start Index where the beginning of the compared part should be
 @param length Length of both array slices (needs to be same)
 @return Returns If arrays are equal
 */
static bool arrayEquals(const char *ar1, const size_t ar1start, const char *ar2, const size_t ar2start, const size_t length)
{
    for (size_t i = 0; i < length; i++) {
        size_t ar2Index = ar2start + i;
        if (ar1[ar1start + i] != ar2[ar2Index]) {
            return false;
        }
    }
    return true;
}

/**
 Takes 2 char arrays and compares each element between them from different starting points. The 2nd array is
 processed in reverse order.
 
 @param ar1 Array with numbers
 @param ar1start Index where the beginning of the compared part should be
 @param ar2 Array with numbers
 @param ar2start Index where the beginning of the compared part should be
 @param length Length of both array slices (needs to be same)
 @return Returns If arrays are equal
 */
static bool arrayEqualsInv(const char *ar1, const size_t ar1start, const char *ar2, const size_t ar2start, const size_t length)
{
    for (size_t i = 0; i < length; i++) {
        size_t ar2Index = ar2start + length - i - 1;
        if (ar1[ar1start + i] != ar2[ar2Index]) {
            return false;
        }
    }
    return true;
}

/**
 Checks if the year in the date should be considered as a pattern.
 
 @param year Year to test
 @return Is the year ok?
 */
static bool isYearOK(int year, bool isShort)
{
#ifdef CONSISTENCY_TEST_TIME
    time_t t = CONSISTENCY_TEST_TIME; // When the consistency test reference file was generated.
#else
    time_t t = time(NULL); // In other cases, use the current time.
#endif
    struct tm *currentDate = localtime(&t);
    int currentYear = 1900 + currentDate->tm_year;
    // We don't expect future dates, so if year is greater than current, then
    // just assume it's in past.
    if (isShort && year > currentYear) {
        year -= 100;
    }
    // Check if the year is more than the current year on less than current minus 90.
    return (year >= currentYear - 90) && (year <= currentYear);
}

/**
 * Parse integer from PIN.
 * @param date PIN to parse as integer.
 * @param size Lenght of characters.
 * @return Integer parsed from PIN.
 */
int parseInt(const char * date, int size)
{
    int value = 0;
    while (*date && size-- > 0) {
        if (!isnumber(*date)) {
            break;
        }
        int digit = *date++ - '0';
        value = value * 10 + digit;
    }
    // Return -1 if date string is shorter than expected.
    return size > 0 ? -1 : value;
}

/**
 * Parse a year from PIN.
 * @param date Input PIN.
 * @return Parsed year or -1 if value is out of expected range.
 */
static int parseYear(const char * date)
{
    int year = parseInt(date, 4);
    if (year < 0) {
        return -1;
    }
    return isYearOK(year, false) ? year : -1;
}

/**
 * Parse a year in short form from PIN.
 * @param date Input PIN.
 * @return Parsed year or -1 if value is out of expected range.
 */
static int parseShortYear(const char * date)
{
    int shortYear = parseInt(date, 2);
    if (shortYear < 0) {
        return -1;
    }
    // The "Year 2000: The Millennium Rollover" paper suggests that
    // values in the range 69-99 refer to the twentieth century.
    // Ref: https://sources.debian.org/src/glibc/2.35-2/time/strptime_l.c/#L755
    int year = shortYear >= 69 ? 1900 + shortYear : 2000 + shortYear;
    return isYearOK(year, true) ? year : -1;
}

/**
 * Parse month from PIN.
 * @param date Input PIN.
 * @return Parsed month or -1 if parsed value is not a month.
 */
static int parseMonth(const char * date)
{
    int m = parseInt(date, 2);
    if (m < 1 || m > 12) {
        return -1;
    }
    return m;
}

/**
 * Parse day from PIN.
 * @param date Input PIN.
 * @return Parsed day or -1 if parsed value is not a day.
 */
static int parseDay(const char * date)
{
    int d = parseInt(date, 2);
    if (d < 1 || d > 31) {
        return -1;
    }
    return d;
}

/**
 * Determine whether year is a leap year.
 * @param year Year to test.
 * @return true if year is a leap year.
 */
bool isLeapYear(int year)
{
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
 * Determine whether day in month is OK.
 * @param day Day in month to test.
 * @param month Month to test.
 * @param year Year, if -1, then year is not known.
 * @return true if day in month is withing accepted range.
 */
static bool isDayInMonthOK(int day, int month, int year)
{
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
 Parsing given date in chosen format. Parsing is successful only when
 the whole string is used.
 @param date Date string
 @param format Format of the date
 @return If parsing was successful
 */
static bool parseDate(const char *date, const char *format)
{
    int year = -1, month = -1, day = -1;
    while (*format && *date) {
        switch (*format++) {
            case 'Y':
                if ((year = parseYear(date)) < 0) {
                    return false;
                }
                date += 4;
                break;
            case 'y':
                if ((year = parseShortYear(date)) < 0) {
                    return false;
                }
                date += 2;
                break;
            case 'm':
                if ((month = parseMonth(date)) < 0) {
                    return false;
                }
                date += 2;
                break;
            case 'd':
                if ((day = parseDay(date)) < 0) {
                    return false;
                }
                date += 2;
                break;
            default:
                return false;
        }
    }
    if (day > 0 && month > 0) {
        return isDayInMonthOK(day, month, year);
    }
    return true;
}


/**
 Calculates how many different digits are in the array.
 For example in array {1,5,6,5} there are 3 unique integer 1,5,6.
 
 @param digits Array with digits
 @param digitsCount Length of the array
 @return Returns count of unique digits
 */
static size_t uniqueDigitsCount(const char *digits, size_t digitsCount)
{
    // The first assumption is that all digits are unique.
    size_t uniqueDigits = digitsCount;
    
    // Verify every digit with the following digits.
    for (size_t i = 0; i < digitsCount; i++) {
        for (size_t u = i + 1; u < digitsCount; u++) {
            // If the same digits are found, mark this digit as not unique
            if (digits[i] == digits[u]) {
                uniqueDigits--;
                break;
            }
        }
    }
    
    return uniqueDigits;
}

/**
 Test if given pin has enough unique digits inside.
 For example for pin 1122 returns false, it only contains 2 unique digits.
 
 @param digits Array with pin
 @param pinLength Length of the pin
 @return Returns if the are enough unique digits
 */
static bool isUniqueOK(const char *digits, size_t pinLength)
{
    // For length to 7 digits, consider 3 unique OK. 4 unique for longer pins.
    return uniqueDigitsCount(digits, pinLength) >= (pinLength <= 7 ? 3 : 4);
}

/**
 Searches for repeating digits in the pin.
 For example, 692692 is repeating.
 
 @param digits Array with the PIN
 @param pinLength Length of the PIN
 @return Returns If there are not repeating digits
 */
static bool isRepeatingOK(const char *digits, size_t pinLength) {
    
    size_t digitsRepeating = 0; // how many digits were found that are in patterns
    // groups that were tested
    size_t groupsTestedCount = 0; // count of groups tested
    struct {
        size_t start;
        size_t length;
    } groupsTested[MAX_PIN_LENGTH/2];
    
    // this is the biggest length of a possible repeating pattern
    const size_t maxLength = pinLength / 2;
    
    // start searching for patterns with various lengths
    for (size_t length = 2; length <= maxLength; length++) {
        
        // start searching for parts of the pin that could be repeated
        // following comments will be explaining searching in pin "12312" for length 2
        size_t start = 0;
        while (start + length <= pinLength - length) {
            
            bool groupWasTested = false;
            // check if this group was already tested
            for (int group=0; group < groupsTestedCount; group++) {
                
                // if the group was already tested, skip it
                if (groupsTested[group].length == length && arrayEquals(digits, start, digits, groupsTested[group].start, length)) {
                    groupWasTested = true;
                    break;
                }
            }
            if (groupWasTested) {
                break;
            }
            
            // remember the group as tested
			if (groupsTestedCount >= MAX_PIN_LENGTH/2) {
				return false;
			}
            groupsTested[groupsTestedCount].start  = start;
            groupsTested[groupsTestedCount].length = length;
            groupsTestedCount++;
            
            bool lastRepeatingFound = false;
            
            // now start moving after the first group to search for repeating patterns
            size_t searchStart = start + length;
            while (searchStart + length <= pinLength) {
                
                // now check if the two groups are equals
                // for the first loop {3,1}, they won't. for second {1,2}, they will. Also, we're checking for inverted order of the second group to potentially match {1,2,3,2,1}
                if (arrayEquals(digits, start, digits, searchStart, length) || arrayEqualsInv(digits, start, digits, searchStart, length)) {
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
    
    return digitsRepeating <= uniqueDigitsCount(digits, pinLength);
}

/**
 Searches for patterns in the pin.
 Patterns can be 1234, 3579, 5331, 2580, ...
 
 @param digits Array with the PIN
 @param pinLength Length of the PIN
 @return Returns if no patterns were found
 */
static bool isPatternOK(const char *digits, const size_t pinLength)
{
    size_t totalSequence = 0;
    
    // start searching for a pattern for where each digit can be the start of the pattern
    // search to pinLength-2, because the pattern needs to be at least 3 digits long
    size_t index = 0;
    while (index < pinLength-2) {
        
        // next number in the pattern. Adding 2 here to skip the first following.
        // 2 numbers cannot be a pattern, they just set how big the 'gap' in the pattern is
        size_t following = index + 2;
        size_t sequence = 0; // how many numbers are involved in the pattern
        size_t repeating = 0; // when the number in the pattern is repeated (like 4556)
        
        int shift = digits[index + 1] - digits[index]; // the gap between two digits of the pattern (it will be 4 for 1,5,9)
        
        while (following < pinLength) {
            // if the third, fourth, ... number has the same gap, it's a pattern
            if (digits[following] - digits[following - 1] == shift) {
                // if we found the first number in the pattern, add 3 as the minimum length for the pattern
                sequence += sequence == 0 ? 3 : 1;
                // if the number is the same as previous, add it to patten too
            } else if (digits[following] == digits[following - 1]) {
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

/**
 Checks, if the pin could be a date in various formats.
 This check should be presented to the user only as a mild warning,
 for example: "This pin looks like a date, is it your birthday?"
 
 It checks following formats: mmdd,ddmm, mmddyy, ddmmyy, mmddyyyy, ddmmyyyy, yyyy.
 For years, it only checks years between CURRENTYEAR-80
 
 @param pin String with the PIN
 @param pinLength Length of the PIN
 @return Returns If the PIN is not a date
 */
static bool isDateOK(const char *pin, const size_t pinLength) {
    
    // only check for pins with even length
    switch (pinLength) {
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
 Determines if the PIN is among the most used ones
 
 @param pin String with the PIN
 @return True if the PIN is among the most used ones
 */
static bool isFrequentlyUsed(const char *pin)
{
    size_t length = sizeof(mostUsedPin) / sizeof(mostUsedPin[0]);
    for (size_t i = 0; i  < length; i++) {
        if (strcmp(pin, mostUsedPin[i]) == 0) {
            return true;
        }
    }
    
    return false;
}

/**
 Validates input string whether contains only digits and is within the "string size limit".

 @param pin String with PIN
 @param pinLength Length of the provided PIN
 @return true If the PIN is not valid.
 */
static bool isInvalidPIN(const char * pin, size_t pinLength) {
	if (pinLength > MAX_PIN_LENGTH || pinLength < MIN_PIN_LENGTH) {
		return true;
	}
    for (size_t index = 0; index < pinLength; index++) {
        char c = pin[index];
        if (c < '0' || c > '9') {
            return true;
        }
    }
    return false;
}


#pragma mark - PUBLIC

WPM_PasscodeResult PinTester_testPasscode(const char *pin)
{
    if (!pin) {
        return WPM_PasscodeResult_WrongInput;
    }
    const size_t pinLength = strlen(pin);
	
    if (isInvalidPIN(pin, pinLength)) {
        return WPM_PasscodeResult_WrongInput;
    }
    
    
    WPM_PasscodeResult result = 0;
    
    if(isFrequentlyUsed(pin)) {
        result |= WPM_PasscodeResult_FrequentlyUsed;
    }
    
    if (!isUniqueOK(pin, pinLength)) {
        result |= WPM_PasscodeResult_NotUnique;
    }
    
    if (!isPatternOK(pin, pinLength)) {
        result |= WPM_PasscodeResult_HasPattern;
    }
    
    if (!isRepeatingOK(pin, pinLength)) {
        result |= WPM_PasscodeResult_RepeatingChars;
    }
    
    if (!isDateOK(pin, pinLength)) {
        result |= WPM_PasscodeResult_PossiblyDate;
    }
    
    if (!result) {
        result = WPM_PasscodeResult_Ok;
    }
    
    return result;
}
