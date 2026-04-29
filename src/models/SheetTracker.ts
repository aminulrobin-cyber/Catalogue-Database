import mongoose, { Schema, Document } from 'mongoose';

export interface ISheetTracker extends Document {
  sheet_id: string;
  title: string;
  url: string;
  total_entries: number;
  error_count: number;
  last_synced: Date;
}

const SheetTrackerSchema: Schema = new Schema({
  sheet_id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  total_entries: { type: Number, default: 0 },
  error_count: { type: Number, default: 0 },
  last_synced: { type: Date, default: Date.now },
});

export default mongoose.models.SheetTracker || mongoose.model<ISheetTracker>('SheetTracker', SheetTrackerSchema);
