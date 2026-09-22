import type { SafeUser } from "@/types/auth";

export interface AddressView {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface AccountErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface ProfileSuccessResponse {
  success: true;
  user: SafeUser;
}

export type ProfileResponse = ProfileSuccessResponse | AccountErrorResponse;

export interface MessageSuccessResponse {
  success: true;
  message: string;
}

export type PasswordChangeResponse = MessageSuccessResponse | AccountErrorResponse;

export interface AddressSuccessResponse {
  success: true;
  address: AddressView;
}

export type AddressResponse = AddressSuccessResponse | AccountErrorResponse;

export interface AddressDeleteSuccessResponse {
  success: true;
}

export type AddressDeleteResponse = AddressDeleteSuccessResponse | AccountErrorResponse;
