/**
 * Mirrors backend {@code PasswordPolicy}: min 8, max 128, at least one letter and one digit.
 */
export function validatePasswordRules(password: string): string | null {
  const raw = password ?? "";
  if (!raw.trim()) {
    return "Mật khẩu không được để trống.";
  }
  if (raw.length < 8) {
    return "Mật khẩu phải có ít nhất 8 ký tự.";
  }
  if (raw.length > 128) {
    return "Mật khẩu không được dài quá 128 ký tự.";
  }
  if (!/[A-Za-z]/.test(raw)) {
    return "Mật khẩu phải chứa ít nhất một chữ cái.";
  }
  if (!/\d/.test(raw)) {
    return "Mật khẩu phải chứa ít nhất một chữ số.";
  }
  return null;
}
