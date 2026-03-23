<?php
/**
 * Input validation utilities.
 * Usage: Validator::email($val), Validator::string($val, 1, 255), etc.
 */
class Validator {

    /**
     * Validate an email address.
     * @return string|false The sanitized email, or false if invalid
     */
    public static function email($value) {
        $email = filter_var(trim($value), FILTER_SANITIZE_EMAIL);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : false;
    }

    /**
     * Validate and sanitize a string.
     * @return string|false Sanitized string, or false if invalid
     */
    public static function string($value, $minLen = 0, $maxLen = 10000) {
        if (!is_string($value)) return false;
        $value = trim($value);
        $len = mb_strlen($value);
        if ($len < $minLen || $len > $maxLen) return false;
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    /**
     * Validate an integer.
     * @return int|false The integer value, or false if invalid
     */
    public static function int($value, $min = PHP_INT_MIN, $max = PHP_INT_MAX) {
        $val = filter_var($value, FILTER_VALIDATE_INT);
        if ($val === false) return false;
        if ($val < $min || $val > $max) return false;
        return $val;
    }

    /**
     * Validate a float/number.
     * @return float|false The float value, or false if invalid
     */
    public static function float($value, $min = -PHP_FLOAT_MAX, $max = PHP_FLOAT_MAX) {
        $val = filter_var($value, FILTER_VALIDATE_FLOAT);
        if ($val === false) return false;
        if ($val < $min || $val > $max) return false;
        return $val;
    }

    /**
     * Check that required fields exist in data object.
     * @return array List of missing field names (empty if all present)
     */
    public static function required($fields, $data) {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data->$field) || (is_string($data->$field) && trim($data->$field) === '')) {
                $missing[] = $field;
            }
        }
        return $missing;
    }
}
?>
