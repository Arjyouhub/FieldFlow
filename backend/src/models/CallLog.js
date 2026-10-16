import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    phoneNumberCalled: {
      type: String,
      required: true,
    },
    outcome: {
      type: String,
      enum: ['Connected', 'Not Connected', 'Busy', 'Switched Off', 'Wrong Number', 'Customer Refused', 'Other'],
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    callTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const CallLog = mongoose.model('CallLog', callLogSchema);
