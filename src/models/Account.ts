import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: true },
  type: { type: String, enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], required: true },
  balanceType: { type: String, enum: ['Debit', 'Credit'], required: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Account;
}
export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
