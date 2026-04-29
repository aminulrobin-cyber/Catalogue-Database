import mongoose, { Schema, Document } from 'mongoose';

export interface IEntry extends Document {
  date: string;
  subject: string;
  chapter: string;
  teacher: string;
  batch: string;
  class_id: string;
  video_link: string;
  pdf_link: string;
  uploader: string;
  sheet_id: string;
  status: 'pending' | 'ok' | 'error';
  video_status: 'pending' | 'ok' | 'broken';
  pdf_status: 'pending' | 'ok' | 'broken';
  duplicate: boolean;
  created_at: Date;
  updated_at: Date;
}

const EntrySchema: Schema = new Schema({
  date: { type: String, default: '' },
  subject: { type: String, default: '' },
  chapter: { type: String, default: '' },
  teacher: { type: String, default: '' },
  batch: { type: String, default: '' },
  class_id: { type: String, required: true },
  video_link: { type: String, default: '' },
  pdf_link: { type: String, default: '' },
  uploader: { type: String, default: '' },
  sheet_id: { type: String, required: true },
  status: { type: String, enum: ['pending', 'ok', 'error'], default: 'pending' },
  video_status: { type: String, enum: ['pending', 'ok', 'broken'], default: 'pending' },
  pdf_status: { type: String, enum: ['pending', 'ok', 'broken'], default: 'pending' },
  duplicate: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for deduplication and faster queries
EntrySchema.index({ class_id: 1 });
EntrySchema.index({ status: 1 });

export default mongoose.models.Entry || mongoose.model<IEntry>('Entry', EntrySchema);
