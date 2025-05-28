'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Schema
const schema = z.object({
  name: z.string().min(2, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  category: z.enum(['small', 'medium', 'large'], { required_error: 'Please select a food category' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});


export default function Signup() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: data.email,
        name: data.name,
        category: data.category,
        role: 'user',
        locked: true,
        startDate: null,
      });
      router.push('/');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-teal-200 via-teal-100 to-white flex items-center justify-center px-4">
      {/* Brand */}
      <div className="absolute top-6 left-6">
        <h1 className="text-2xl font-extrabold text-teal-700">Foodtrack</h1>
      </div>

      {/* Signup Form */}
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-white/40">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sign up</h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 bg-white/80"
              placeholder="Your Name"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 bg-white/80"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div>

          {/* Food Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Category</label>
            <div className="flex space-x-4">
              {['small', 'medium', 'large'].map((size) => (
                <label key={size} className="inline-flex items-center space-x-2">
                  <input
                    type="radio"
                    value={size}
                    {...register('category')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="capitalize text-gray-700">{size}</span>
                </label>
              ))}
            </div>
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
            )}
          </div>
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 bg-white/80"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 text-white rounded-lg transition duration-200 font-semibold ${loading ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
              }`}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-700">
          Already have an account?{' '}
          <a href="/login" className="text-teal-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
