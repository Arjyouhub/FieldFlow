import mongoose from 'mongoose';

const customerLocationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Home', 'Office', 'Shop', 'Relative', 'Other'],
      default: 'Home',
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    capturedAtDevice: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED', // Can be configured if new locations require admin approval
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    rejectionReason: {
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

// Geo compound index for location queries
customerLocationSchema.index({ customerId: 1, isActive: 1, status: 1 });

export const CustomerLocation = mongoose.model('CustomerLocation', customerLocationSchema);
