import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], required: true },
  balanceType: { type: String, enum: ['Debit', 'Credit'], required: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
