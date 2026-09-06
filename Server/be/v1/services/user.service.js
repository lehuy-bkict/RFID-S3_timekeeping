'use strict';

const { UserModel } = require('../../database_model/modelUser');

class UserService {
  async create(data) {
    return await UserModel.create(data);
  }

  async getAll(query = {}) {
    return await UserModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async getById(id) {
    return await UserModel.findById(id).lean();
  }

  async getByCardNumber(cardNumber) {
    if (!cardNumber) return null;
    return await UserModel.findOne({ cardNumber: String(cardNumber).trim() }).lean();
  }

  async update(id, updateData) {
    updateData.updatedAt = new Date();
    return await UserModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
  }

  async delete(id) {
    return await UserModel.findByIdAndDelete(id).lean();
  }
}

module.exports = {
  UserService: new UserService()
};
