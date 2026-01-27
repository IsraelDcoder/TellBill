/**
 * ✅ AI SCOPE DRIFT DETECTION
 * 
 * Analyzes contractor voice transcripts to detect additional/out-of-scope work
 * that should trigger automatic Scope Proof creation for client approval
 */

const SCOPE_DRIFT_INDICATORS = {
  // Direct indicators
  keywords: [
    "also",
    "extra",
    "while i was there",
    "while i was",
    "fixed another",
    "fixed the",
    "client asked",
    "customer asked",
    "she asked",
    "he asked",
    "they asked",
    "additionally",
    "furthermore",
    "plus",
    "and then",
    "then i",
    "oh and",
    "one more thing",
    "i also",
    "we also",
    "should probably",
    "might as well",
    "let me",
    "let's",
    "added",
    "installed",
    "replaced",
    "upgraded",
    "throw in",
    "throw that in",
    "on top of that",
    "at no extra cost", // Red flag - contractor doing free work
    "no charge",
    "free",
    "complimentary",
  ],

  // Phrases that signal additional work
  phrases: [
    "while i was there",
    "since i was there",
    "since i had",
    "as long as i was",
    "while we were at it",
    "might as well",
    "took the opportunity",
    "went ahead and",
    "went and",
    "took a minute",
    "didn't take long",
    "quick fix",
    "knocked that out",
    "real quick",
  ],

  // Material/labor additions
  materials: [
    "added hardware",
    "extra screws",
    "additional brackets",
    "more adhesive",
    "extra caulk",
    "sealant",
    "primer",
    "extra paint",
    "more grout",
  ],
};

export interface ScopeDriftDetection {
  detected: boolean;
  confidence: number; // 0-1
  indicators: string[]; // Which keywords/phrases triggered
  description?: string; // AI-cleaned description of extra work
  estimatedCost?: number; // AI-estimated cost if mentioned
  reasoning: string;
}

/**
 * Detect scope drift in transcript
 * Returns analysis of whether additional work was mentioned
 */
export function detectScopeDrift(transcript: string): ScopeDriftDetection {
  const lowerTranscript = transcript.toLowerCase();
  const indicators: string[] = [];
  let confidenceScore = 0;

  // Check for keyword matches
  for (const keyword of SCOPE_DRIFT_INDICATORS.keywords) {
    if (lowerTranscript.includes(keyword)) {
      indicators.push(keyword);
      confidenceScore += 0.15;
    }
  }

  // Check for phrase matches (higher weight)
  for (const phrase of SCOPE_DRIFT_INDICATORS.phrases) {
    if (lowerTranscript.includes(phrase)) {
      indicators.push(`phrase: ${phrase}`);
      confidenceScore += 0.25;
    }
  }

  // Check for material additions
  for (const material of SCOPE_DRIFT_INDICATORS.materials) {
    if (lowerTranscript.includes(material)) {
      indicators.push(`material: ${material}`);
      confidenceScore += 0.2;
    }
  }

  // Red flags reduce confidence (contractor doing free work)
  if (
    lowerTranscript.includes("at no extra cost") ||
    lowerTranscript.includes("no charge") ||
    lowerTranscript.includes("free")
  ) {
    confidenceScore *= 0.5; // Mark as low confidence - needs review
  }

  // Cap confidence at 1.0
  const finalConfidence = Math.min(confidenceScore, 0.95);

  const detected = finalConfidence > 0.3;

  return {
    detected,
    confidence: finalConfidence,
    indicators: [...new Set(indicators)], // Remove duplicates
    reasoning:
      indicators.length > 0
        ? `Found ${indicators.length} scope drift indicator(s): ${indicators.slice(0, 3).join(", ")}`
        : "No scope drift indicators detected",
  };
}

/**
 * Extract description of additional work from transcript using simple heuristics
 * This is a fallback - ideal would use LLM to extract properly
 */
export function extractExtraWorkDescription(transcript: string): string {
  // Find sentences containing scope drift indicators
  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim());

  const relevantSentences: string[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Check if sentence contains scope drift keywords
    for (const keyword of SCOPE_DRIFT_INDICATORS.keywords) {
      if (lower.includes(keyword)) {
        relevantSentences.push(sentence);
        break;
      }
    }
  }

  // Return combined description
  if (relevantSentences.length > 0) {
    return relevantSentences.slice(0, 2).join(" ").trim();
  }

  return "Additional work performed on site";
}

/**
 * Estimate cost based on keywords found in transcript
 * This is a heuristic - ideal would use LLM
 */
export function estimateExtraWorkCost(transcript: string): number {
  let estimatedCost = 75; // Base cost for any additional work

  const lower = transcript.toLowerCase();

  // Adjust based on complexity indicators
  if (lower.includes("hour") || lower.includes("hours")) {
    // Extract hour mentions
    const hourMatch = transcript.match(/(\d+)\s*hours?/i);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1]);
      const ratePerHour = 85; // Average contractor rate
      estimatedCost = Math.max(estimatedCost, hours * ratePerHour);
    }
  }

  // Material costs
  if (lower.includes("material") || lower.includes("supplies")) {
    estimatedCost += 50;
  }

  // Multiple items mentioned
  if (
    (lower.match(/and/g) || []).length > 2 ||
    (lower.match(/also|plus|additionally/g) || []).length > 1
  ) {
    estimatedCost += 100;
  }

  // Complex work signals
  if (
    lower.includes("electrical") ||
    lower.includes("plumbing") ||
    lower.includes("structural")
  ) {
    estimatedCost = Math.max(estimatedCost, 200);
  }

  return Math.round(estimatedCost);
}

/**
 * Full scope drift analysis with all details
 */
export async function analyzeScopeDrift(
  transcript: string
): Promise<ScopeDriftDetection & { description: string; estimatedCost: number }> {
  const driftAnalysis = detectScopeDrift(transcript);

  return {
    ...driftAnalysis,
    description: extractExtraWorkDescription(transcript),
    estimatedCost: estimateExtraWorkCost(transcript),
  };
}
