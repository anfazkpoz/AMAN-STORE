import mongoose from 'mongoose';

const JournalLineSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  type: { type: String, enum: ['Debit', 'Credit'], required: true },
  amount: { type: Number, required: true },
});

const JournalEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  narration: { type: String },
  lf: { type: String },
  lines: [JournalLineSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.JournalEntry || mongoose.model('JournalEntry', JournalEntrySchema);
