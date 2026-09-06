'use strict';

const { Types, Schema, model } = require('mongoose');

const UserSchema = new Schema({
  _id: {
    type: Types.ObjectId,
    default: () => new Types.ObjectId()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  avatar: {
    type: String, // Base64 data URI of the original portrait image
    required: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  versionKey: false,
  collection: 'Users'
});

module.exports = {
  UserModel: model('Users', UserSchema)
};
