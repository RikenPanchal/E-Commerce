import type { BackInStockAlertView } from "@/lib/shop/backInStock";

export interface BackInStockErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface BackInStockSubscribeSuccessResponse {
  success: true;
  alreadySubscribed: boolean;
}

export type BackInStockSubscribeResponse = BackInStockSubscribeSuccessResponse | BackInStockErrorResponse;

export interface BackInStockMessageSuccessResponse {
  success: true;
  message: string;
}

export type BackInStockUnsubscribeResponse = BackInStockMessageSuccessResponse | BackInStockErrorResponse;

export interface BackInStockAlertsSuccessResponse {
  success: true;
  alerts: BackInStockAlertView[];
}

export type BackInStockAlertsResponse = BackInStockAlertsSuccessResponse | BackInStockErrorResponse;
