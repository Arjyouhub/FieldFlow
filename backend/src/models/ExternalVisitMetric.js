import mongoose from 'mongoose';

const externalVisitMetricSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    portfolioCode: {
      type: String,
      default: 'NAVI',
      uppercase: true,
      index: true,
    },
    slots: {
      '9-11': { type: Number, default: 0, min: 0 },
      '11-1': { type: Number, default: 0, min: 0 },
      '1-3': { type: Number, default: 0, min: 0 },
      '3-5': { type: Number, default: 0, min: 0 },
      '5-6': { type: Number, default: 0, min: 0 },
    },
    totalCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index per staff per date per external app portfolio
externalVisitMetricSchema.index({ date: 1, staffId: 1, portfolioCode: 1 }, { unique: true });

// Auto-sum total visits across slots
externalVisitMetricSchema.pre('save', function (next) {
  const s = this.slots || {};
  this.totalCount =
    (Number(s['9-11']) || 0) +
    (Number(s['11-1']) || 0) +
    (Number(s['1-3']) || 0) +
    (Number(s['3-5']) || 0) +
    (Number(s['5-6']) || 0);
  next();
});

export const ExternalVisitMetric = mongoose.model('ExternalVisitMetric', externalVisitMetricSchema);
