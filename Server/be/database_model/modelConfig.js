'use strict';

const { Schema, model } = require('mongoose');

const ConfigSchema = new Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  versionKey: false,
  collection: 'Config'
});

module.exports = {
  ConfigModel: model('Config', ConfigSchema)
};
