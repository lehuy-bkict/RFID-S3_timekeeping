'use strict';

const { Types } = require('mongoose');
const { UserService } = require('../services/user.service');
const { decryptString } = require('../../utils/checkapikey.js');

async function checkApiKey(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    res.send({
      success: false,
      messages: 'API key không tồn tại',
      error: 'MissingApiKey',
      data: {}
    });
    return false;
  }

  let isValid = true;
  await decryptString(apiKey)
    .then(() => { isValid = true; })
    .catch(() => { isValid = false; });

  if (!isValid) {
    res.send({
      success: false,
      messages: 'API key không hợp lệ',
      error: 'InvalidApiKey',
      data: apiKey
    });
    return false;
  }
  return true;
}

class UserController {
  async GetData(req, res) {
    if (!await checkApiKey(req, res)) return;

    try {
      const { search } = req.body || {};
      let query = {};
      if (search && typeof search === 'string' && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query = {
          $or: [
            { name: regex },
            { cardNumber: regex },
            { phone: regex },
            { department: regex }
          ]
        };
      }

      const users = await UserService.getAll(query);
      return res.send({
        success: true,
        messages: '',
        error: '',
        data: users
      });
    } catch (err) {
      console.error('UserController.GetData error:', err);
      return res.send({
        success: false,
        messages: err.message || err.toString(),
        error: '1',
        data: []
      });
    }
  }

  async Create(req, res) {
    if (!await checkApiKey(req, res)) return;

    try {
      const { name, cardNumber, avatar, phone, email, department, note } = req.body || {};

      if (!name || !name.trim()) {
        return res.send({
          success: false,
          messages: 'Họ tên người dùng không được để trống',
          error: 'MissingName',
          data: {}
        });
      }

      if (!cardNumber || !String(cardNumber).trim()) {
        return res.send({
          success: false,
          messages: 'Mã thẻ RFID không được để trống',
          error: 'MissingCardNumber',
          data: {}
        });
      }

      if (!avatar || !String(avatar).startsWith('data:image/')) {
        return res.send({
          success: false,
          messages: 'Vui lòng cung cấp ảnh chân dung gốc hợp lệ (Base64)',
          error: 'MissingAvatar',
          data: {}
        });
      }

      const trimmedCard = String(cardNumber).trim();
      const existing = await UserService.getByCardNumber(trimmedCard);
      if (existing) {
        return res.send({
          success: false,
          messages: `Mã thẻ RFID "${trimmedCard}" đã được gán cho người dùng "${existing.name}". Vui lòng dùng mã thẻ khác.`,
          error: 'DuplicateCardNumber',
          data: {}
        });
      }

      const newUser = await UserService.create({
        name: name.trim(),
        cardNumber: trimmedCard,
        avatar,
        phone: phone ? String(phone).trim() : '',
        email: email ? String(email).trim() : '',
        department: department ? String(department).trim() : '',
        note: note ? String(note).trim() : '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return res.send({
        success: true,
        messages: 'Thêm người dùng thành công',
        error: '',
        data: newUser
      });
    } catch (err) {
      console.error('UserController.Create error:', err);
      return res.send({
        success: false,
        messages: err.message || err.toString(),
        error: '1',
        data: {}
      });
    }
  }

  async Update(req, res) {
    if (!await checkApiKey(req, res)) return;

    try {
      const { _id, name, cardNumber, avatar, phone, email, department, note } = req.body || {};

      if (!_id || !Types.ObjectId.isValid(_id)) {
        return res.send({
          success: false,
          messages: 'ID người dùng không hợp lệ',
          error: 'InvalidId',
          data: {}
        });
      }

      const existingUser = await UserService.getById(_id);
      if (!existingUser) {
        return res.send({
          success: false,
          messages: 'Không tìm thấy người dùng cần cập nhật',
          error: 'UserNotFound',
          data: {}
        });
      }

      const updateData = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = String(phone).trim();
      if (email !== undefined) updateData.email = String(email).trim();
      if (department !== undefined) updateData.department = String(department).trim();
      if (note !== undefined) updateData.note = String(note).trim();
      if (avatar && String(avatar).startsWith('data:image/')) updateData.avatar = avatar;

      if (cardNumber && String(cardNumber).trim() !== existingUser.cardNumber) {
        const trimmedCard = String(cardNumber).trim();
        const dup = await UserService.getByCardNumber(trimmedCard);
        if (dup && String(dup._id) !== String(_id)) {
          return res.send({
            success: false,
            messages: `Mã thẻ RFID "${trimmedCard}" đã được gán cho người dùng "${dup.name}".`,
            error: 'DuplicateCardNumber',
            data: {}
          });
        }
        updateData.cardNumber = trimmedCard;
      }

      const updated = await UserService.update(_id, updateData);
      return res.send({
        success: true,
        messages: 'Cập nhật thông tin thành công',
        error: '',
        data: updated
      });
    } catch (err) {
      console.error('UserController.Update error:', err);
      return res.send({
        success: false,
        messages: err.message || err.toString(),
        error: '1',
        data: {}
      });
    }
  }

  async Delete(req, res) {
    if (!await checkApiKey(req, res)) return;

    try {
      const { _id } = req.body || {};

      if (!_id || !Types.ObjectId.isValid(_id)) {
        return res.send({
          success: false,
          messages: 'ID người dùng không hợp lệ',
          error: 'InvalidId',
          data: {}
        });
      }

      const result = await UserService.delete(_id);
      if (!result) {
        return res.send({
          success: false,
          messages: 'Không tìm thấy người dùng để xóa',
          error: 'NotFound',
          data: {}
        });
      }

      return res.send({
        success: true,
        messages: 'Xóa người dùng thành công',
        error: '',
        data: result
      });
    } catch (err) {
      console.error('UserController.Delete error:', err);
      return res.send({
        success: false,
        messages: err.message || err.toString(),
        error: '1',
        data: {}
      });
    }
  }
}

module.exports = new UserController();
