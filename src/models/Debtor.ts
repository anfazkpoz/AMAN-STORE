import mongoose from 'mongoose';

const DebtorSchema = new mongoose.Schema({
  accountId: { type: String, ref: 'Account', required: true },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  batch: { type: String },
  currentBalance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Debtor || mongoose.model('Debtor', DebtorSchema);
