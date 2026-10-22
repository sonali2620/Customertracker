import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Star } from 'lucide-react';
import { api } from '../../services/api';

export function FeedbackModal({ isOpen, onClose, complaintId, ticketNumber, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please choose a rating.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.submitFeedback(complaintId, { rating, comment });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Satisfaction Feedback" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Ticket {ticketNumber}</p>
          <h4 className="text-sm font-semibold text-slate-800 mt-1">
            How satisfied are you with our resolution?
          </h4>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* 5-Star Rating Selector */}
        <div className="flex items-center justify-center space-x-2 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 focus:outline-none transition-transform hover:scale-125"
            >
              <Star
                className={`w-8 h-8 ${
                  (hoverRating || rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="text-center">
          <span className="text-xs font-semibold text-slate-700">
            {rating === 5 && 'Outstanding! (5/5)'}
            {rating === 4 && 'Good Resolution (4/5)'}
            {rating === 3 && 'Average (3/5)'}
            {rating === 2 && 'Needs Improvement (2/5)'}
            {rating === 1 && 'Unsatisfactory (1/5)'}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Optional Comments or Testimonial
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what we did well or how we could improve..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
