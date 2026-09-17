/**
 * @typedef {Object} CategoryMeta
 * @property {string} key
 * @property {string} name
 * @property {string} description
 * @property {string} color
 * @property {string} icon
 * @property {number} count
 * @property {number} percentage
 * @property {number} avgConfidence
 */

/**
 * @typedef {Object} ConfidenceBucket
 * @property {string} range
 * @property {number} count
 */

/**
 * @typedef {Object} CategorizedRecord
 * @property {number} id
 * @property {Object.<string, string>} originalData
 * @property {string} category
 * @property {string} [categoryKey]
 * @property {number} confidence
 * @property {Object.<string, number>} scores
 * @property {string[]} matchedKeywords
 * @property {string} reasoning
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {number} totalRecords
 * @property {number} categorized
 * @property {number} uncategorized
 * @property {Object.<string, { count: number, percentage: number, avgConfidence: number }>} categories
 * @property {number} averageConfidence
 * @property {number} processingTimeMs
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} id
 * @property {string} filename
 * @property {number} totalRecords
 * @property {string[]} columns
 * @property {string[]} textFields
 * @property {AnalysisSummary} summary
 * @property {CategoryMeta[]} categoryMeta
 * @property {ConfidenceBucket[]} confidenceDistribution
 * @property {CategorizedRecord[]} records
 */

/**
 * @typedef {Object} TextAnalysisResult
 * @property {string} category
 * @property {string} [categoryKey]
 * @property {number} confidence
 * @property {Object.<string, number>} scores
 * @property {string[]} matchedKeywords
 * @property {string} reasoning
 */

/**
 * @typedef {"upload" | "analyzing" | "results"} AppView
 */