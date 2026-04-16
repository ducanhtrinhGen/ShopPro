import { apiRequest } from "./client";

export type PasswordResetRequestResponse = { message: string };

export async function requestPasswordReset(email: string) {
  return apiRequest<PasswordResetRequestResponse>("/api/auth/password-reset/request", {
    method: "POST",
    body: { email }
  });
}

export async function confirmPasswordReset(body: { token: string; newPassword: string; confirmPassword: string }) {
  return apiRequest<{ message: string }>("/api/auth/password-reset/confirm", {
    method: "POST",
    body
  });
}

export async function changeAuthenticatedPassword(body: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiRequest<void>("/api/auth/password/change", {
    method: "POST",
    body
  });
}
