/**
 * Deep Scan AI - Categorization Engine
 * 
 * Scores each incident/service request against all category rules
 * and assigns the best-matching category with a confidence score.
 */

import { CATEGORIES } from "./rules.js";

/**
 * Normalize text for matching: lowercase, remove special chars, collapse whitespace
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score a single text against a category's keyword groups.
 * Returns { score, matchedKeywords, groupBreakdown }
 */
function scoreCategory(text, category) {
  const normalized = normalizeText(text);
  let totalScore = 0;
  const matchedKeywords = [];
  const groupBreakdown = [];

  for (const group of category.keywordGroups) {
    let groupScore = 0;
    const groupMatches = [];

    for (const keyword of group.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      // Check for phrase match
      if (normalized.includes(normalizedKeyword)) {
        // Longer keywords (phrases) get a bonus
        const lengthBonus = normalizedKeyword.split(" ").length > 1 ? 1.5 : 1;
        const keywordScore = group.weight * lengthBonus;
        groupScore += keywordScore;
        groupMatches.push({ keyword, score: keywordScore });
        matchedKeywords.push(keyword);
      }
    }

    if (groupMatches.length > 0) {
      groupBreakdown.push({
        groupName: group.name,
        score: groupScore,
        matches: groupMatches,
      });
    }

    totalScore += groupScore;
  }

  return { score: totalScore, matchedKeywords, groupBreakdown };
}

/**
 * Categorize a single record (incident/service request).
 * 
 * @param {object} record - The record with description and other fields
 * @param {string[]} textFields - Which fields to analyze (e.g., ["description", "short_description", "summary"])
 * @returns {object} Categorization result
 */
function categorizeRecord(record, textFields) {
  // Combine all text fields into one analysis string
  const combinedText = textFields
    .map((field) => record[field] || "")
    .join(" ");

  if (!combinedText.trim()) {
    return {
      category: "Uncategorized",
      confidence: 0,
      scores: {},
      matchedKeywords: [],
      reasoning: "No text content to analyze",
    };
  }

  const results = {};
  let maxScore = 0;
  let maxCategory = null;

  for (const [key, category] of Object.entries(CATEGORIES)) {
    const result = scoreCategory(combinedText, category);
    results[key] = result;
    if (result.score > maxScore) {
      maxScore = result.score;
      maxCategory = key;
    }
  }

  // Calculate confidence as a percentage
  const totalScore = Object.values(results).reduce((sum, r) => sum + r.score, 0);
  let confidence = 0;
  if (totalScore > 0 && maxCategory) {
    confidence = Math.round((results[maxCategory].score / totalScore) * 100);
  }

  // If no keywords matched at all
  if (!maxCategory || maxScore === 0) {
    return {
      category: "Uncategorized",
      confidence: 0,
      scores: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [CATEGORIES[k].name, v.score])
      ),
      matchedKeywords: [],
      reasoning: "No matching keywords found in the text",
    };
  }

  // Build reasoning
  const winnerResult = results[maxCategory];
  const topGroups = winnerResult.groupBreakdown
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((g) => g.groupName);

  const reasoning = `Matched ${winnerResult.matchedKeywords.length} keyword(s) in ${CATEGORIES[maxCategory].name} category. Top signal areas: ${topGroups.join(", ")}.`;

  return {
    category: CATEGORIES[maxCategory].name,
    categoryKey: maxCategory,
    confidence,
    scores: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [CATEGORIES[k].name, v.score])
    ),
    matchedKeywords: winnerResult.matchedKeywords,
    reasoning,
  };
}

/**
 * Analyze an entire dataset (array of records).
 * 
 * @param {object[]} records - Array of records
 * @param {string[]} textFields - Which fields to analyze
 * @returns {object} Full analysis with categorized records, summary stats, etc.
 */
function analyzeDataset(records, textFields) {
  const startTime = Date.now();

  const categorizedRecords = records.map((record, index) => {
    const result = categorizeRecord(record, textFields);
    return {
      id: index + 1,
      originalData: record,
      ...result,
    };
  });

  // Build summary statistics
  const summary = {
    totalRecords: records.length,
    categorized: 0,
    uncategorized: 0,
    categories: {},
    averageConfidence: 0,
    processingTimeMs: 0,
  };

  let totalConfidence = 0;

  for (const record of categorizedRecords) {
    if (record.category === "Uncategorized") {
      summary.uncategorized++;
    } else {
      summary.categorized++;
      totalConfidence += record.confidence;
    }

    if (!summary.categories[record.category]) {
      summary.categories[record.category] = {
        count: 0,
        percentage: 0,
        avgConfidence: 0,
        totalConfidence: 0,
      };
    }
    summary.categories[record.category].count++;
    summary.categories[record.category].totalConfidence += record.confidence;
  }

  for (const [cat, stats] of Object.entries(summary.categories)) {
    stats.percentage = Math.round((stats.count / records.length) * 100);
    stats.avgConfidence =
      stats.count > 0 ? Math.round(stats.totalConfidence / stats.count) : 0;
    delete stats.totalConfidence;
  }

  summary.averageConfidence =
    summary.categorized > 0
      ? Math.round(totalConfidence / summary.categorized)
      : 0;

  summary.processingTimeMs = Date.now() - startTime;

  const categoryMeta = Object.entries(CATEGORIES).map(([key, cat]) => ({
    key,
    name: cat.name,
    description: cat.description,
    color: cat.color,
    icon: cat.icon,
    count: summary.categories[cat.name]?.count || 0,
    percentage: summary.categories[cat.name]?.percentage || 0,
    avgConfidence: summary.categories[cat.name]?.avgConfidence || 0,
  }));

  if (summary.uncategorized > 0) {
    categoryMeta.push({
      key: "uncategorized",
      name: "Uncategorized",
      description: "Records that could not be categorized",
      color: "#6B7280",
      icon: "HelpCircle",
      count: summary.uncategorized,
      percentage: Math.round((summary.uncategorized / records.length) * 100),
      avgConfidence: 0,
    });
  }

  const confidenceBuckets = [
    { range: "0-20%", min: 0, max: 20, count: 0 },
    { range: "21-40%", min: 21, max: 40, count: 0 },
    { range: "41-60%", min: 41, max: 60, count: 0 },
    { range: "61-80%", min: 61, max: 80, count: 0 },
    { range: "81-100%", min: 81, max: 100, count: 0 },
  ];

  for (const record of categorizedRecords) {
    for (const bucket of confidenceBuckets) {
      if (record.confidence >= bucket.min && record.confidence <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return {
    summary,
    categoryMeta,
    confidenceDistribution: confidenceBuckets,
    records: categorizedRecords,
  };
}

export { categorizeRecord, analyzeDataset, normalizeText, CATEGORIES };