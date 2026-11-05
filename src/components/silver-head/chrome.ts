import { motionValue } from 'framer-motion';

/**
 * Shared scroll-scrubbed opacity for fixed site chrome that lives outside the
 * hero subtree. The value is reset when the hero unmounts.
 */
export const heroChromeOpacity = motionValue(1);
