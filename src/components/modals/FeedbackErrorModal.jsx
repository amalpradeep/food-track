import React from 'react'

const FeedbackErrorModal = ({ onClose, errorMessage }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm mx-4 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )
};

export default FeedbackErrorModal;