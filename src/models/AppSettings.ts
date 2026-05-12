import mongoose from 'mongoose';

/**
 * AppSettings — a singleton document (key = "global") that stores
 * lightweight application-wide configuration flags.
 * 
 * SAFE: This is a brand-new collection. It does NOT touch or modify
 * the User, JournalEntry, Account, or Debtor schemas/collections.
 */
const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  isRegistrationEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.AppSettings ||
  mongoose.model('AppSettings', AppSettingsSchema);
