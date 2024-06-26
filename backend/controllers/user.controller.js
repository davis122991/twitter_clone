import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';

import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

// Get User Profile controller
export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log('Error in getUserProfile: ', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Follow Unfollow User controller
export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id.toString());

    // Check if user to follow/unfollow isn't same id as current user
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    // Check if users exist
    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check to follow or unfollow
    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow user
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

      // TODO: return the id of the user as a response
      res.status(200).json({ message: 'User unfollowed successfully' });
    } else {
      // Follow user
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
      // Send notification to the user
      const newNotification = new Notification({
        type: 'follow',
        from: req.user._id,
        to: userToModify._id,
      });

      await newNotification.save();

      // TODO: return the id of the user as a response
      res.status(200).json({ message: 'User followed successfully' });
    }
  } catch (error) {
    console.log('Error in followUnfollowUser: ', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get Suggested Profile
export const getSuggestedProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const usersFollowedByMe = await User.findById(userId).select('following');

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);

    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id)
    );
    const suggestedUsers = filteredUsers.slice(0, 4);

    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log('Error in filteredUsers: ', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update User Profile
export const updateUser = async (req, res) => {
  const {
    fullName,
    email,
    username,
    currentPassword,
    newPassword,
    bio,
    link,
    profileImg,
    coverImg,
  } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user password
    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res.status(400).json({
        error: 'Please provide both current password and new password',
      });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 6 characters' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Update user profile image
    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(
          user.profileImg.split('/').pop().split('.')[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    // Update user cover image
    if (coverImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(
          user.profileImg.split('/').pop().split('.')[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      profileImg = uploadedResponse.secure_url;
    }

    // Update user credentials
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;
    user.link = link || user.link;

    // Save updated user info to database
    user = await user.save();

    // Set return user object password to null
    user.password = null;

    return res.status(200).json({ user });
  } catch (error) {
    console.log('Error in updateUser: ', error.message);
    res.status(500).json({ error: error.message });
  }
};
