import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  image: string;
  role: 'admin' | 'viewer';
  last_login: Date;
  login_count: number;
  admin_request: boolean;
  sections_viewed: number;
  created_at: Date;
  updated_at: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  image: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  last_login: { type: Date, default: Date.now },
  login_count: { type: Number, default: 1 },
  admin_request: { type: Boolean, default: false },
  sections_viewed: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
