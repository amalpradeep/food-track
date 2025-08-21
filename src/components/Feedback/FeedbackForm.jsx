'use client';

import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import BlacklistModal from '@/components/modals/BlacklistModal';
import FeedbackErrorModal from '@/components/modals/FeedbackErrorModal';
import FeedbackSuccessModal from '@/components/modals/FeedbackSuccessModal';

const FeedbackForm = ({ user, onClose, onSubmit }) => {
  const [category, setCategory] = useState('food_quality');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);

  const categories = [
    { value: 'food_quality', label: 'Food Quality' },
    { value: 'service', label: 'Service' },
    { value: 'app_experience', label: 'App Experience' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!comment.trim()) {
      newErrors.comment = 'Please provide feedback';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // Check if user is blacklisted
    try {
      const blacklistDoc = await getDoc(doc(db, 'blacklist', user.uid));
      if (blacklistDoc.exists()) {
        setShowBlacklistModal(true);
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error('Error checking blacklist status:', error);
    }

    if (comment.length > 500) {
      newErrors.comment = 'Feedback must be at most 500 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const feedbackId = `${user.uid}_${Date.now()}`;
      const feedbackData = {
        id: feedbackId,
        userId: user.uid,
        userName: user.name || user.email,
        userCategory: user.category || 'medium',
        category,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
        status: 'new', // new, reviewed, resolved
        adminResponse: null
      };

      await setDoc(doc(db, 'feedback', feedbackId), feedbackData);

      // Send notification to admin
      await fetch('/api/user-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📝 New Feedback from ${user.name}.\n
          Category: ${category.replace('_', ' ').toUpperCase()}.\n
          Comment: ${comment}`
        }),
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setErrorMessage('Failed to submit feedback. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Share Your Feedback</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errors.comment) {
                  setErrors(prev => ({ ...prev, comment: '' }));
                }
              }}
              rows={4}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.comment ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Please share your thoughts, suggestions, or concerns..."
            />
            {errors.comment && (
              <p className="text-red-500 text-xs mt-1">{errors.comment}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          <p className="text-xs text-red-400 mb-4">
            * Feedbacks cannot be edited or deleted once submitted.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>

      {showSuccessModal && (
        <FeedbackSuccessModal
          onClose={() => {
            setShowSuccessModal(false);
            onSubmit?.();
            onClose();
          }}
        />
      )}

      {showErrorModal && (
        <FeedbackErrorModal
          onClose={() => setShowErrorModal(false)}
          errorMessage={errorMessage}
        />
      )}

      {showBlacklistModal && (
        <BlacklistModal
          onClose={() => {
            setShowBlacklistModal(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default FeedbackForm;
