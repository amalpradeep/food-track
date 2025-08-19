'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FeedbackHistory = ({ user, onClose }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const q = query(
          collection(db, 'feedback'),
          where('userId', '==', user.uid),
        );
        
        const querySnapshot = await getDocs(q);
        const feedbackData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFeedbacks(feedbackData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (error) {
        console.error('Error fetching feedback history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [user.uid]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Your Feedback History</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600 flex items-center gap-2">
                <div className="w-5 h-5 border-t-2 border-b-2 border-gray-400 rounded-full animate-spin" />
                Loading your feedback...
              </div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>You haven't submitted any feedback yet.</p>
              <p className="text-sm mt-2">Share your thoughts to help us improve!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">
                        {getCategoryLabel(feedback.category)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                        {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(feedback.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 text-sm mb-3">
                    {feedback.comment}
                  </p>
                  
                  {feedback.adminResponse && (
                    <div className="bg-teal-50 border-l-4 border-teal-400 p-3 mt-3">
                      <p className="text-sm font-medium text-teal-800 mb-1">Admin Response:</p>
                      <p className="text-sm text-teal-700">{feedback.adminResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackHistory;
