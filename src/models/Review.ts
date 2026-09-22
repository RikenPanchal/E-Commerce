import { Schema, model, models, Types, type Model, type HydratedDocument } from "mongoose";

export interface ReviewAttributes {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<ReviewAttributes>;

const reviewSchema = new Schema<ReviewAttributes>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per customer per product - resubmitting updates it instead of
// creating a duplicate.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

const Review: Model<ReviewAttributes> =
  (models.Review as Model<ReviewAttributes>) || model<ReviewAttributes>("Review", reviewSchema);

export default Review;
