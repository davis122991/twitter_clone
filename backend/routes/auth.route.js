import express from 'express';
import {
  login,
  logout,
  signup,
  getMe,
} from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

// Get Me endpoint
router.get('/me', protectRoute, getMe);

// Signup endpoint
router.post('/signup', signup);

// Login endpoint
router.post('/login', login);

// Logout endpoint
router.post('/logout', logout);

export default router;
