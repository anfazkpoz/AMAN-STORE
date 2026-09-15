import mongoose from 'mongoose';

const CashTransferSchema = new mongoose.Schema({
  staffId: { type: String, required: true },
  staffName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
}, { timestamps: true });

export default mongoose.models.CashTransfer || mongoose.model('CashTransfer', CashTransferSchema);
