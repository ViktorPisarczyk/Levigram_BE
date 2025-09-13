import { Schema, model, Types } from "mongoose";

const subscriptionSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", index: true, default: null },
  sub: {
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subscriptionSchema.index({ "sub.endpoint": 1 }, { unique: true });

export const Subscription = model("Subscription", subscriptionSchema);
