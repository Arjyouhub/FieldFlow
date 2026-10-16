import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema(
  {
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
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    accuracy: {
      type: Number,
      required: true,
    },
    clientTimestamp: {
      type: Date,
      default: Date.now,
    },
    serverTimestamp: {
      type: Date,
      default: Date.now, // Authoritative timestamp
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['LOCATION_MATCHED', 'OUTSIDE_RADIUS', 'ACCURACY_POOR', 'NO_SAVED_LOCATIONS'],
      required: true,
      index: true,
    },
    matchedLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerLocation',
    },
    distanceMetres: {
      type: Number,
    },
    configuredRadiusMetres: {
      type: Number,
      default: 100,
    },
    isSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationReason: {
      type: String,
    },
    outcome: {
      type: String,
      enum: [
        'Payment Collected',
        'Promise to Pay (PTP)',
        'Customer Unavailable',
        'House Locked',
        'Wrong Address',
        'Refused to Pay',
        'Other Feedback',
      ],
      required: true,
    },
    collectedAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'None'],
      default: 'None',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['NONE', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'],
      default: 'NONE',
      index: true,
    },
    ptpAmount: {
      type: Number,
      default: 0,
    },
    ptpDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Visit = mongoose.model('Visit', visitSchema);
