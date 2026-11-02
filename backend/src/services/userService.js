const fs = require('fs/promises');
const path = require('path');
const { Op } = require('sequelize');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { pick } = require('../utils/object');
const { getNotificationSettings } = require('./settingsService');
const { AVATAR_DIR } = require('../middleware/upload');
const taskService = require('./taskService');

const PROFILE_FIELDS = ['name', 'email', 'countryCode', 'phoneNumber', 'timezone'];

async function updateProfile(user, input) {
  const data = pick(input, PROFILE_FIELDS);
  if (data.email) {
    data.email = data.email.toLowerCase();
    if (data.email !== user.email) {
      const taken = await User.findOne({ where: { email: data.email, id: { [Op.ne]: user.id } } });
      if (taken) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
  }

  const before = { timezone: user.timezone, whatsapp: user.getWhatsappNumber() };
  await user.update(data);

  // WhatsApp consent belongs to a phone number: a new number must opt in again.
  if (user.getWhatsappNumber() !== before.whatsapp) {
    const settings = await getNotificationSettings(user.id);
    if (settings.whatsappOptIn || settings.whatsappEnabled) {
      await settings.update({ whatsappOptIn: false, whatsappOptInAt: null, whatsappEnabled: false });
    }
  }
  if (user.timezone !== before.timezone) {
    await taskService.recomputeForTimezone(user);
  }
  return user.reload();
}

const removeAvatarFile = async (profileImage) => {
  if (!profileImage || !profileImage.startsWith('/uploads/avatars/')) return;
  try {
    await fs.unlink(path.join(AVATAR_DIR, path.basename(profileImage)));
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn('[avatar] could not delete old file:', err.message);
  }
};

async function setAvatar(user, file) {
  if (!file) throw ApiError.badRequest('No image uploaded', 'VALIDATION_ERROR');
  const previous = user.profileImage;
  await user.update({ profileImage: `/uploads/avatars/${file.filename}` });
  await removeAvatarFile(previous);
  return user;
}

async function removeAvatar(user) {
  const previous = user.profileImage;
  await user.update({ profileImage: null });
  await removeAvatarFile(previous);
  return user;
}

module.exports = { updateProfile, setAvatar, removeAvatar };
