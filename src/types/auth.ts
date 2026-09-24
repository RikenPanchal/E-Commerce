/**
 * Shared auth-related types used across the API routes, forms and
 * server-side helpers. Keeping them in one place avoids duplicating
 * shapes between the client forms and the route handlers.
 */

export type UserRole = "admin" | "user";

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SigninInput {
  email: string;
  password: string;
}

/** Public-facing user shape - never includes the password hash. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

/** Payload encoded inside the auth JWT. */
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthSuccessResponse {
  success: true;
  user: SafeUser;
}

export interface AuthErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

export interface ForgotPasswordSuccessResponse {
  success: true;
  message: string;
  /** Only set in local development when email isn't configured (no EMAIL_USER/EMAIL_PASS) - never in production. See the route handler. */
  devResetUrl?: string;
}

export type ForgotPasswordResponse = ForgotPasswordSuccessResponse | AuthErrorResponse;
