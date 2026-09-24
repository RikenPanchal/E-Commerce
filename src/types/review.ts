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

export const REVIEW_SORTS = ["newest", "highest", "lowest"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

/** One page of a product's reviews, plus what the pager needs to render. */
export interface ReviewPage {
  reviews: ReviewView[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  sort: ReviewSort;
}

export type ReviewPageResponse = ({ success: true } & ReviewPage) | ReviewErrorResponse;
