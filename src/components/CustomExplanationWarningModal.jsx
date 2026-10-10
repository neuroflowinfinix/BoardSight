import React from 'react';

export default function CustomExplanationWarningModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
        <h3 className="text-lg font-black text-orange-600 dark:text-orange-500 mb-2">Note</h3>
        <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-6 leading-relaxed">
          Your custom explanations (only if they were edited manually) wouldn't be shared along the link. Instead, click export and share the file !! which can be imported directly into the website.
        </p>
        <div className="flex gap-3 mt-2">
          <button 
            onClick={onConfirm}
            className="flex-1 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors shadow-sm"
          >
            I understand
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
