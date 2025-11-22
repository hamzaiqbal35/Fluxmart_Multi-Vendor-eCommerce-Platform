const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');


router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    // Add full avatar URL to each user
    const usersWithAvatarUrl = users.map(user => {
      const userObj = user.toObject();
      if (userObj.avatar) {
        // Remove any existing /uploads/avatars/ from the avatar path to prevent duplication
        const cleanAvatarPath = userObj.avatar.replace(/^\/uploads\/avatars\//, '');
        userObj.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${cleanAvatarPath}`;
      }
      return userObj;
    });
    
    res.json({
      success: true,
      users: usersWithAvatarUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const userObj = user.toObject();
    
    // Add full avatar URL if avatar exists
    if (userObj.avatar) {
      // Remove any existing /uploads/avatars/ from the avatar path to prevent duplication
      const cleanAvatarPath = userObj.avatar.replace(/^\/uploads\/avatars\//, '');
      userObj.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${cleanAvatarPath}`;
    }
    
    res.json({
      success: true,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userObj = user.toObject();
    
    // Add full avatar URL if avatar exists
    if (userObj.avatar) {
      // Remove any existing /uploads/avatars/ from the avatar path to prevent duplication
      const cleanAvatarPath = userObj.avatar.replace(/^\/uploads\/avatars\//, '');
      userObj.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${cleanAvatarPath}`;
    }
    
    res.json({
      success: true,
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/me', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.put('/me/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'User deleted'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

