export interface ReviewView {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ReviewSuccessResponse {
  success: true;
  review: ReviewView;
}

export interface ReviewErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

export type ReviewResponse = ReviewSuccessResponse | ReviewErrorResponse;
