import mongoose from 'mongoose';

const suspiciousEventSchema = new mongoose.Schema(
  {
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    distanceMetres: {
      type: Number,
      required: true,
    },
    radiusMetres: {
      type: Number,
      default: 100,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    actualCoordinates: {
      lat: Number,
      lng: Number,
    },
    reason: {
      type: String,
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'CONFIRMED_MISMATCH', 'LEGITIMATE_ALTERNATE', 'NEEDS_MORE_EVIDENCE', 'FALSE_ALERT'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const SuspiciousEvent = mongoose.model('SuspiciousEvent', suspiciousEventSchema);
