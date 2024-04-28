import express from 'express';
import { login, logout, signup } from '../controllers/auth.controller.js';

const router = express.Router();

// Signup endpoint
router.post('/signup', signup);

// Login endpoint
router.post('/login', login);

// Logout endpoint
router.post('/logout', logout);

export default router;
