import React from 'react'

const FeedbackSuccessModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm mx-4 text-center">
        <div className="text-3xl mb-4">✅</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Thank You!</h3>
        <p className="text-gray-600 mb-4">Your feedback has been submitted successfully.</p>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded bg-teal-600 text-white hover:bg-teal-700"
        >
          Close
        </button>
      </div>
    </div>
  )
};

export default FeedbackSuccessModal;