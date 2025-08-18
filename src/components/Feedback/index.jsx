import React, { useState } from 'react'
import FeedbackForm from '@/components/Feedback/FeedbackForm';
import FeedbackHistory from '@/components/Feedback/FeedbackHistory';

const FeedbackSection = ({ user, userId }) => {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);

  return (
    <>
      <div className="mt-5 w-full">
        <div className="border border-teal-200 rounded-xl p-6 shadow-sm bg-teal-50">
          <h3 className="text-lg font-semibold text-teal-600 mb-3">Share Your Experience</h3>
          <p className="text-sm text-teal-700 mb-4">Help us improve by sharing your feedback about our food service.</p>
          <div className="flex gap-3">
            <button
              className='flex-1 bg-teal-600 text-white py-2 px-4 rounded hover:bg-teal-700 transition cursor-pointer text-sm font-medium'
              onClick={() => setShowFeedbackForm(true)}
            >
              📝 Give Feedback
            </button>
            <button
              className='flex-1 bg-white border border-teal-600 text-teal-600 py-2 px-4 rounded hover:bg-teal-50 transition cursor-pointer text-sm font-medium'
              onClick={() => setShowFeedbackHistory(true)}
            >
              📋 View History
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <FeedbackForm
          user={{ ...user, uid: userId?.uid }}
          onClose={() => setShowFeedbackForm(false)}
          onSubmit={() => {
            // Refresh feedback history if it's open
            if (showFeedbackHistory) {
              setShowFeedbackHistory(false);
              setTimeout(() => setShowFeedbackHistory(true), 100);
            }
          }}
        />
      )}

      {/* Feedback History Modal */}
      {showFeedbackHistory && (
        <FeedbackHistory
          user={userId}
          onClose={() => setShowFeedbackHistory(false)}
        />
      )}
    </>
  )
}

export default FeedbackSection;