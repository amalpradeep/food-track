import React from 'react'

const BlacklistModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-4 text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Feedback Restricted</h3>
        <p className="text-gray-600 mb-4">
          Your account has been temporarily blacklisted and restricted from submitting feedback due to spam activity.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm">
            <strong>Reason:</strong> Multiple spam submissions detected
          </p>
          <p className="text-red-600 text-sm mt-2">
            If you believe this is an error, please contact support.
          </p>
        </div>
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

export default BlacklistModal;