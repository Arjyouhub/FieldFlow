import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonthlyBatch',
      index: true,
    },
    batchMonth: {
      type: String,
      default: 'OCT-2026',
      index: true,
    },
    loanAccountNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    outstandingAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    pos: {
      type: Number,
      default: 0,
    },
    tos: {
      type: Number,
      default: 0,
    },
    dpd: {
      type: Number,
      default: 0,
    },
    isPlanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    plannedVisitDate: {
      type: Date,
      default: null,
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
        'ptp',
        'broken_ptp',
        'rtp',
        'payment_submitted',
        'paid',
        'unpaid',
        'non_workable',
        'suspicious_visit',
        'pending_verification',
      ],
      default: 'assigned',
      index: true,
    },
    nonWorkableReason: {
      type: String,
      enum: [
        '',
        'Wrong Address',
        'House Locked',
        'Customer Not Available',
        'Phone Not Reachable',
        'Business Closed',
        'Customer Refused',
        'Other',
      ],
      default: '',
    },
    lastVisitDate: {
      type: Date,
    },
    lastVisitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
    },
    totalCollected: {
      type: Number,
      default: 0,
    },
    ptpAmount: {
      type: Number,
      default: 0,
    },
    ptpDate: {
      type: Date,
    },
    assignmentHistory: [
      {
        previousStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        newStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: '' },
      },
    ],
    auditHistory: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deleteReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per portfolio and account
caseSchema.index({ portfolioId: 1, loanAccountNo: 1 }, { unique: true });

export const Case = mongoose.model('Case', caseSchema);
