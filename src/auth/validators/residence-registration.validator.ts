export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export class ResidenceRegistrationValidator {
  /**
   * Validate Korean residence registration number (13 digits)
   * Format: YYMMDD-NNNNNNN
   * First 6 digits: Birth date (YYMMDD)
   * Last 7 digits: Sequential number + gender + region + checksum
   */
  static validate(prefix: string, suffix: string): ValidationResult {
    const fullNumber = prefix + suffix;
    
    // Length check
    if (fullNumber.length !== 13) {
      return { valid: false, message: 'Số đăng ký cư trú phải có 13 chữ số' };
    }
    
    // Format check - only digits
    if (!/^\d{13}$/.test(fullNumber)) {
      return { valid: false, message: 'Số đăng ký cư trú chỉ được chứa chữ số' };
    }
    
    // Validate birth date (first 6 digits: YYMMDD)
    const dateValidation = this.validateBirthDate(prefix);
    if (!dateValidation.valid) {
      return dateValidation;
    }
    
    // Validate gender digit (7th digit)
    const genderDigit = parseInt(suffix.charAt(0));
    if (genderDigit < 1 || genderDigit > 4) {
      return { valid: false, message: 'Số đăng ký cư trú không hợp lệ (mã giới tính)' };
    }
    
    // Validate checksum (last digit)
    if (!this.validateChecksum(fullNumber)) {
      return { valid: false, message: 'Số đăng ký cư trú không hợp lệ (kiểm tra tổng)' };
    }
    
    return { valid: true };
  }

  /**
   * Validate birth date portion (YYMMDD)
   */
  private static validateBirthDate(prefix: string): ValidationResult {
    if (prefix.length !== 6) {
      return { valid: false, message: '6 chữ số đầu không hợp lệ' };
    }

    const year = parseInt(prefix.substring(0, 2));
    const month = parseInt(prefix.substring(2, 4));
    const day = parseInt(prefix.substring(4, 6));
    
    // Month validation
    if (month < 1 || month > 12) {
      return { valid: false, message: 'Tháng sinh không hợp lệ (01-12)' };
    }
    
    // Day validation
    if (day < 1 || day > 31) {
      return { valid: false, message: 'Ngày sinh không hợp lệ (01-31)' };
    }
    
    // More specific day validation based on month
    const daysInMonth = this.getDaysInMonth(month, year);
    if (day > daysInMonth) {
      return { valid: false, message: `Ngày sinh không hợp lệ cho tháng ${month}` };
    }
    
    return { valid: true };
  }

  /**
   * Get number of days in a month
   */
  private static getDaysInMonth(month: number, year: number): number {
    // For 2-digit year, assume 1900s or 2000s based on common practice
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check for leap year (February)
    if (month === 2) {
      const isLeapYear = (fullYear % 4 === 0 && fullYear % 100 !== 0) || (fullYear % 400 === 0);
      return isLeapYear ? 29 : 28;
    }
    
    return daysInMonth[month - 1];
  }

  /**
   * Validate checksum using Korean residence registration algorithm
   */
  private static validateChecksum(number: string): boolean {
    if (number.length !== 13) return false;
    
    const digits = number.split('').map(Number);
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * weights[i];
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === digits[12];
  }

  /**
   * Extract birth year from residence registration number
   */
  static extractBirthYear(prefix: string, genderDigit: number): number {
    const year = parseInt(prefix.substring(0, 2));
    
    // Determine century based on gender digit
    // 1,2: 1900-1999, 3,4: 2000-2099
    if (genderDigit === 1 || genderDigit === 2) {
      return 1900 + year;
    } else if (genderDigit === 3 || genderDigit === 4) {
      return 2000 + year;
    }
    
    // Default fallback
    return year < 50 ? 2000 + year : 1900 + year;
  }

  /**
   * Extract gender from residence registration number
   */
  static extractGender(genderDigit: number): 'male' | 'female' | 'unknown' {
    if (genderDigit === 1 || genderDigit === 3) {
      return 'male';
    } else if (genderDigit === 2 || genderDigit === 4) {
      return 'female';
    }
    return 'unknown';
  }

  /**
   * Generate test residence registration numbers for development
   */
  static generateTestNumber(): { prefix: string; suffix: string } {
    // Generate a valid test number
    const year = Math.floor(Math.random() * 50) + 50; // 50-99 (1950-1999)
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1; // Safe day range
    
    const prefix = `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    
    // Generate suffix with valid checksum
    const genderDigit = Math.floor(Math.random() * 2) + 1; // 1 or 2
    const sequentialDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    
    const partialSuffix = genderDigit + sequentialDigits;
    const fullNumber = prefix + partialSuffix;
    
    // Calculate checksum
    const digits = fullNumber.split('').map(Number);
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * weights[i];
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    const suffix = partialSuffix + checkDigit;
    
    return { prefix, suffix };
  }
}
