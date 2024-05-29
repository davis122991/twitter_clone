import { v2 as cloudinary } from 'cloudinary';

import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import Notification from '../models/notification.model.js';

// Create Post controller
export const createPost = async (req, res) => {
  try {
    // Get text or image from frontend
    const { text } = req.body;
    let { img } = req.body;

    // Get user ID
    const userId = req.user._id.toString();

    // Check if user exist
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if text or image exist
    if (!text && !img) {
      return res.status(400).json({ error: 'Post must have text or image' });
    }

    // Upload image
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    // Create post
    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    // Save & return post
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
    console.log('Error in createPost controller:', error);
  }
};

// Delete Post controller
export const deletePost = async (req, res) => {
  try {
    // Find post to delete
    const post = await Post.findById(req.params.id);

    // Check if post exist
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if current user own post
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: 'You are not authorized to delete this post' });
    }

    // Delete image from cloudinary database
    if (post.img) {
      const imgId = post.img.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(imgId);
    }

    // Delete post from mongoose database
    await Post.findByIdAndDelete(req.params.id);

    // Return success message
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
    console.log('Error in deletePost controller:', error);
  }
};

// Comment On Post controller
export const commentOnPost = async (req, res) => {
  try {
    // Getting id's and comment text
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    // Check if there is a text
    if (!text) {
      return res.status(400).json({ error: 'Text field is required' });
    }

    // Checking if post exist
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Creating comment object
    const comment = { user: userId, text };

    // Adding and updating post
    post.comments.push(comment);
    await post.save();

    // Returning post
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
    console.log('Error in commentOnPost controller:', error);
  }
};

// Like Unlike Post controller
export const likeUnlikePost = async (req, res) => {
  try {
    // Getting id's of user and post
    const userId = req.user._id;
    const { id: postId } = req.params;

    // Finding & checking if post exist
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Checking if post is already liked by a user
    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      res.status(200).json(updatedLikes);
    } else {
      // Like post
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      // Creating & saving notification
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: 'like',
      });
      await notification.save();

      const updatedLikes = post.likes;
      res.status(200).json(updatedLikes);
    }
  } catch (error) {
    console.log('Error in likeUnlikePost controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get All Posts controller
export const getAllPosts = async (req, res) => {
  try {
    // Getting all posts and sorting them from latest
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      });

    // Returning empty array, if there is no posts
    if (posts.length === 0) {
      return res.status(200).json([]);
    }

    // Returning posts
    res.status(200).json(posts);
  } catch (error) {
    console.log('Error in getAllPosts controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Liked Posts controller
export const getLikedPosts = async (req, res) => {
  // Getting user id
  const userId = req.params.id;
  try {
    // Checking if user exist
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Getting liked posts
    const likedPosts = await Post.find({
      _id: { $in: user.likedPosts },
    })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      });

    // Returning liked posts
    res.status(200).json(likedPosts);
  } catch (error) {
    console.log('Error in getLikedPosts controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Following Posts controller
export const getFollowingPosts = async (req, res) => {
  try {
    // Getting user
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Checking if user exist
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Getting following
    const following = user.following;

    // Getting feed posts
    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({
        createdAt: -1,
      })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      });

    // Returning feed posts
    res.status(200).json(feedPosts);
  } catch (error) {
    console.log('Error in getFollowingPosts controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get User Posts controller
export const getUserPosts = async (req, res) => {
  try {
    // Get username
    const { username } = req.params;

    // Check if user exist
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Getting all user posts
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      });

    // Returning user posts
    res.status(200).json(posts);
  } catch (error) {
    console.log('Error in getUserPosts controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
