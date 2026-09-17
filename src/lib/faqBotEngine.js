// src/lib/faqBotEngine.js
import faqData from "../data/faq.json";

/**
 * Normalize text: lowercase, remove punctuation, trim.
 */
function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize into words
 */
function tokenize(text) {
  return normalize(text).split(" ");
}

/**
 * Compute simple similarity score between user input and FAQ question.
 * Uses word overlap + fuzzy scoring.
 */
function computeScore(queryTokens, faqTokens) {
  if (!faqTokens.length) return 0;

  let overlap = 0;
  for (let q of queryTokens) {
    if (faqTokens.includes(q)) overlap++;
  }

  const overlapScore = overlap / Math.max(queryTokens.length, faqTokens.length);

  // Fuzzy bonus: partial match of substrings
  let fuzzy = 0;
  for (let q of queryTokens) {
    for (let f of faqTokens) {
      if (f.includes(q) || q.includes(f)) fuzzy += 0.1;
    }
  }

  return overlapScore + Math.min(fuzzy, 0.4); // Cap fuzzy bonus
}

/**
 * MAIN FUNCTION: returns best matching FAQ answer
 */
export function getFaqAnswer(userMessage) {
  const queryNorm = normalize(userMessage);
  const queryTokens = tokenize(queryNorm);

  let best = null;
  let bestScore = -1;

  for (const faq of faqData) {
    const faqTokens = tokenize(faq.question);
    const score = computeScore(queryTokens, faqTokens);

    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return {
    answer: best ? best.answer : "Sorry, no answer found.",
    question: best ? best.question : null,
    category: best ? best.category : null,
    score: bestScore,
  };
}