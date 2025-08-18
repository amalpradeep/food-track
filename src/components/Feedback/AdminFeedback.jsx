'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, new, reviewed, resolved
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const q = query(
        collection(db, 'feedback'),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const feedbackData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setFeedbacks(feedbackData);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'all') return true;
    return feedback.status === filter;
  });

  const handleRespond = async () => {
    setIsResponding(true);
    try {
      const updateData = { status: 'resolved' };
      if (adminResponse.trim()) {
        updateData.adminResponse = adminResponse.trim();
      }
      updateData.respondedAt = new Date().toISOString();

      await updateDoc(doc(db, 'feedback', selectedFeedback.id), updateData);

      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === selectedFeedback.id
            ? { ...f, ...updateData }
            : f
        )
      );

      setSelectedFeedback(null);
      setAdminResponse('');
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Failed to update feedback');
    } finally {
      setIsResponding(false);
    }
  };

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
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  const getCategoryLabel = (category) => {
    return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  const getStatusCounts = () => {
    return {
      all: feedbacks.length,
      new: feedbacks.filter(f => f.status === 'new').length,
      reviewed: feedbacks.filter(f => f.status === 'reviewed').length,
      resolved: feedbacks.filter(f => f.status === 'resolved').length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-teal-600">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-teal-700">User Feedback Management</h3>
        <button
          onClick={fetchFeedbacks}
          className="px-3 py-1 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'all', label: 'All' },
          { key: 'new', label: 'New' },
          { key: 'reviewed', label: 'Reviewed' },
          { key: 'resolved', label: 'Resolved' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === key
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {label} ({statusCounts[key]})
          </button>
        ))}
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No feedback found for the selected filter.</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className={`border rounded-lg p-4 ${getStatusColor(feedback.status)}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-4">
                  <div className="font-medium text-gray-900">{feedback.userName}</div>
                  <div className="text-sm text-gray-600">({feedback.userCategory})</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">{formatDate(feedback.timestamp)}</div>
                  <div className="text-md text-gray-600 mt-1">
                    {getCategoryLabel(feedback.category)}
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-3">{feedback.comment}</p>

              {feedback.adminResponse && (
                <div className="bg-white/50 border-l-4 border-teal-400 p-3 mb-3">
                  <p className="text-sm font-medium text-teal-800 mb-1">Admin Response:</p>
                  <p className="text-sm text-teal-700">{feedback.adminResponse}</p>
                  {feedback.respondedAt && (
                    <p className="text-xs text-teal-600 mt-1">
                      Responded on {formatDate(feedback.respondedAt)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {feedback.status === 'new' && (
                  <button
                    onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                  >
                    Mark as Reviewed
                  </button>
                )}

                {feedback.status !== 'resolved' && (
                  <button
                    onClick={() => setSelectedFeedback(feedback)}
                    className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                  >
                    Respond & Resolve
                  </button>
                )}

                {feedback.status === 'resolved' && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                    ✓ Resolved
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4">Respond to Feedback</h4>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{selectedFeedback.userName}</span>
                <span className="text-sm text-gray-600">({getCategoryLabel(selectedFeedback.category)})</span>
              </div>
              <p className="text-sm text-gray-700">{selectedFeedback.comment}</p>
            </div>

            <textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter your response to the user..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setSelectedFeedback(null);
                  setAdminResponse('');
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                disabled={isResponding}
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={isResponding}
                className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm disabled:opacity-50"
              >
                {isResponding ? 'Responding...' : 'Send Response & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
