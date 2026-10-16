import mongoose from 'mongoose';

const monthlyBatchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    totalCases: {
      type: Number,
      default: 0,
    },
    totalOutstanding: {
      type: Number,
      default: 0,
    },
    importedAt: {
      type: Date,
      default: Date.now,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

monthlyBatchSchema.index({ portfolioId: 1, name: 1 }, { unique: true });

export const MonthlyBatch = mongoose.model('MonthlyBatch', monthlyBatchSchema);
