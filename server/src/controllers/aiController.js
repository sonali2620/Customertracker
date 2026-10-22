import { suggestCategoryAndPriority, summarizeComplaintThread, draftPoliteCustomerResponse } from '../services/aiService.js';

/**
 * AI Assistant: Suggest category & priority classification for complaint draft
 */
export async function suggestClassification(req, res, next) {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        message: 'At least title or description is required for AI classification.'
      });
    }

    const suggestion = await suggestCategoryAndPriority({ title, description });

    return res.json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    next(error);
  }
}

/**
 * AI Assistant: Summarize full complaint thread
 */
export async function summarizeThread(req, res, next) {
  try {
    const { id } = req.params;
    const summary = await summarizeComplaintThread(id);

    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

/**
 * AI Assistant: Generate polite draft reply for agent review
 */
export async function draftResponse(req, res, next) {
  try {
    const { id } = req.params;
    const { intention = 'ACKNOWLEDGEMENT' } = req.body;

    const draft = await draftPoliteCustomerResponse(id, intention);

    return res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    next(error);
  }
}
