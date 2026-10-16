import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config',
    },
    defaultRadiusMetres: {
      type: Number,
      default: 100,
    },
    maxAllowedAccuracyMetres: {
      type: Number,
      default: 50,
    },
    duplicateDetectionMetres: {
      type: Number,
      default: 25,
    },
    requireApprovalForNewLocations: {
      type: Boolean,
      default: false,
    },
    allowedLocationTypes: {
      type: [String],
      default: ['Home', 'Office', 'Shop', 'Relative', 'Other'],
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
