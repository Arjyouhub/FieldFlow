import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      index: true,
    },
    loanAccountNo: {
      type: String,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      default: '',
    },
    area: {
      type: String,
      default: '',
    },
    outstandingAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    emiAmount: {
      type: Number,
      default: 0,
    },
    dpd: {
      type: Number,
      default: 0,
    },
    loanAmount: {
      type: Number,
      default: 0,
    },
    pos: {
      type: Number,
      default: 0,
    },
    pincode: {
      type: String,
      default: '',
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'assigned',
        'pending',
        'unvisited',
        'visited',
        'collected',
        'paid',
        'unpaid',
        'ptp',
        'broken_ptp',
        'rtp',
        'non_workable',
        'suspicious_visit',
        'pending_verification',
        'payment_submitted',
      ],
      default: 'pending',
      index: true,
    },
    batchMonth: {
      type: String,
      default: 'OCT-2026',
      index: true,
    },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, default: '' },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.model('Customer', customerSchema);
