import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    // Validate required fields
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/Username and password are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${identifier.trim()}$`, 'i') } },
        { username: { $regex: new RegExp(`^${identifier.trim()}$`, 'i') } }
      ]
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '30d' } // Longer expiration for URL tokens
    );

    // Remove password from response
    const userResponse = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
    };

    return NextResponse.json(
      { 
        message: 'Login successful',
        user: userResponse,
        token,
        expiresIn: '30d'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
