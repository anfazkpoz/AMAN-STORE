import mongoose from 'mongoose';

// Store a push subscription object (PushSubscription JSON) per user
const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  subscription: { type: Object, required: true }, // full PushSubscription JSON
}, { timestamps: true });

export default mongoose.models.PushSubscription ||
  mongoose.model('PushSubscription', PushSubscriptionSchema);
