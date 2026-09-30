/** Copilot thresholds, shared by the answer engine and the /methods page. */

/** Calibrated: closest-passage cosine was 0.524–0.763 for in-scope and 0.165–0.451 for out-of-scope questions. */
export const RELEVANCE_GATE = 0.48;
/** Minimum question similarity for serving a saved (precomputed) answer offline. */
export const PRECOMPUTED_MATCH = 0.8;
