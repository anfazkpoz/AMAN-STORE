import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  mobile: { type: String },
  password: { type: String },
  role: { type: String, enum: ['Admin', 'Staff', 'Student'], required: true },
  batch: { type: String },
  debtorId: { type: String },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
