/**
 * NeuroDefender — Text Adversarial Detection Engine v2.0
 * Detects: zero-width chars, homoglyphs, unicode manipulation, hidden payloads,
 * invisible characters, obfuscated text, suspicious URLs, encoded content.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ─── Unicode / Invisible Character Detection ──────────────────────────────────

const ZERO_WIDTH_CHARS = [
  '\u200B', '\u200C', '\u200D', '\u200E', '\u200F', // zero-width space, joiners, marks
  '\u2060', '\u2061', '\u2062', '\u2063', '\u2064', // word joiners, invisible operators
  '\uFEFF', // BOM / zero-width no-break space
  '\u00AD', // soft hyphen
  '\u034F', // combining grapheme joiner
  '\u115F', '\u1160', // Hangul fillers
  '\u3164', // Hangul filler
];

const HOMOGLYPH_MAP = {
  // Cyrillic look-alikes for Latin chars
  'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y',
  'і':'i','ї':'i','ё':'e','ъ':'b','ь':'b',
  // Greek look-alikes
  'α':'a','ε':'e','ο':'o','ρ':'p','τ':'t','υ':'u','χ':'x',
  // Fullwidth chars
  'ａ':'a','ｂ':'b','ｃ':'c','ｄ':'d','ｅ':'e','ｆ':'f','ｇ':'g',
  // Common leet-substitution symbols used in obfuscation
  '@':'a','3':'e','1':'i','0':'o','5':'s','$':'s','7':'t','!':'i',
};

// Suspicious URL patterns
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(ru|cn|tk|ml|ga|cf|gq|xyz|top|work|click|online|site|fun|pw|cc)\b/gi;

// Base64-like encoded payload pattern
const BASE64_PATTERN = /[A-Za-z0-9+/]{20,}={0,2}/g;

// Hex encoding pattern
const HEX_PATTERN = /(?:0x)?[0-9a-fA-F]{8,}/g;

// Script injection patterns
const SCRIPT_PATTERNS = [
  /<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i,
  /document\./i, /window\./i, /alert\s*\(/i, /fetch\s*\(/i,
];

// ─── Shannon Entropy ──────────────────────────────────────────────────────────

function textEntropy(text) {
  if (!text.length) return 0;
  const freq = {};
  for (const ch of text) freq[ch] = (freq[ch] || 0) + 1;
  const len = text.length;
  return Object.values(freq).reduce((e, c) => {
    const p = c / len;
    return e - p * Math.log2(p);
  }, 0);
}

// ─── Zero-Width / Invisible Character Score ───────────────────────────────────

function invisibleCharScore(text) {
  let count = 0;
  for (const ch of text) {
    if (ZERO_WIDTH_CHARS.includes(ch)) count++;
    // General invisible Unicode ranges
    const cp = ch.codePointAt(0);
    if (cp >= 0x2000 && cp <= 0x206F) count++; // General Punctuation (many invisible)
    if (cp >= 0xE000 && cp <= 0xF8FF) count++; // Private Use Area
  }
  // Even 1 zero-width char is suspicious; normalize
  return Math.min(1, count / Math.max(1, text.length * 0.01) * 0.8 + (count > 0 ? 0.4 : 0));
}

// ─── Homoglyph Attack Score ───────────────────────────────────────────────────

function homoglyphScore(text) {
  let hits = 0;
  for (const ch of text) {
    if (HOMOGLYPH_MAP[ch] !== undefined) hits++;
  }
  const ratio = hits / Math.max(1, text.length);
  return Math.min(1, ratio * 4);
}

// ─── Obfuscation / Character Anomaly Score ────────────────────────────────────

function anomalyScore(text) {
  if (!text.length) return 0;

  let special = 0, repeated = 0, numeric = 0, mixedWordPenalty = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!/[a-zA-Z ]/.test(ch)) special++;
    if (i > 0 && ch === text[i - 1]) repeated++;
    if (/\d/.test(ch)) numeric++;
  }

  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.length < 2) continue;
    const hasLetter = /[a-zA-Z]/.test(word);
    const hasSuspicious = /[^a-zA-Z]/.test(word);
    if (hasLetter && hasSuspicious) {
      mixedWordPenalty += word.length;
    }
  }

  const len = text.length;
  const lengthFactor = len < 20 ? 1.5 : len > 500 ? 0.85 : 1.0;
  const raw = (special * 1.0 + repeated * 0.8 + numeric * 0.9 + mixedWordPenalty * 1.5) / len;
  return Math.min(1, raw * lengthFactor);
}

// ─── Phishing / Suspicious URL Score ─────────────────────────────────────────

function suspiciousUrlScore(text) {
  const urls = text.match(URL_PATTERN) || [];
  if (urls.length === 0) return 0;
  // Any URL is mildly suspicious; suspicious TLD or multiple URLs = higher score
  const suspiciousTldCount = urls.filter(u => /\.(ru|cn|tk|ml|ga|cf|gq|xyz|top|click|pw|cc)/i.test(u)).length;
  return Math.min(1, 0.3 * urls.length + 0.5 * suspiciousTldCount);
}

// ─── Encoded Payload Score (base64, hex, script) ──────────────────────────────

function encodedPayloadScore(text) {
  let score = 0;
  const b64Matches = text.match(BASE64_PATTERN) || [];
  const hexMatches = text.match(HEX_PATTERN) || [];
  score += Math.min(0.4, b64Matches.length * 0.15);
  score += Math.min(0.3, hexMatches.length * 0.1);
  for (const pat of SCRIPT_PATTERNS) {
    if (pat.test(text)) { score += 0.35; break; }
  }
  return Math.min(1, score);
}

// ─── Unicode Script Mixing Score ──────────────────────────────────────────────

function unicodeMixingScore(text) {
  // Detect mixing of different Unicode script blocks in close proximity
  let transitions = 0;
  let prevBlock = null;
  const getBlock = (cp) => {
    if (cp < 0x0080) return 'latin';
    if (cp < 0x0250) return 'latin-ext';
    if (cp >= 0x0400 && cp < 0x0500) return 'cyrillic';
    if (cp >= 0x0370 && cp < 0x0400) return 'greek';
    if (cp >= 0x4E00 && cp < 0xA000) return 'cjk';
    if (cp >= 0x0600 && cp < 0x0700) return 'arabic';
    return 'other';
  };
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    const block = getBlock(ch.codePointAt(0));
    if (prevBlock && block !== prevBlock && block !== 'other' && prevBlock !== 'other') {
      transitions++;
    }
    prevBlock = block;
  }
  return Math.min(1, transitions / Math.max(1, text.length / 10) * 0.8);
}

// ─── Model Confidence (entropy-based) ─────────────────────────────────────────

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function modelConfidence(text) {
  if (!text.length) return 1;
  const entropy = textEntropy(text);
  const maxEntropy = Math.log2(Math.min(text.length, 95)) || 1;
  const normalizedEntropy = Math.min(1, entropy / maxEntropy);
  const lengthPenalty = text.length < 5 ? 0.3 : 0;
  return Math.max(0, 1 - normalizedEntropy * 0.7 - lengthPenalty);
}

function perturbationScore(text) {
  const normalized = normalizeText(text);
  const origConf  = modelConfidence(text);
  const cleanConf = modelConfidence(normalized || text);
  return Math.min(1, Math.abs(origConf - cleanConf));
}

// ─── Threat Classifier ────────────────────────────────────────────────────────

function classifyThreat(score) {
  if (score > 0.55) return "HIGH";
  if (score > 0.30) return "MEDIUM";
  return "LOW";
}

function generateSummary(scores, threatLevel, text) {
  if (threatLevel === "LOW") return "No adversarial patterns detected. Text appears clean.";

  const findings = [];
  if (scores.invisible > 0.1) findings.push("zero-width/invisible characters");
  if (scores.homoglyph > 0.1) findings.push("homoglyph substitution attack");
  if (scores.unicodeMix > 0.1) findings.push("unicode script mixing");
  if (scores.encoded > 0.1)   findings.push("encoded payload detected");
  if (scores.url > 0.1)       findings.push("suspicious URL pattern");
  if (scores.anomaly > 0.4)   findings.push("heavy character obfuscation");

  if (findings.length === 0) findings.push("character-level anomalies");

  return threatLevel === "HIGH"
    ? `High-risk adversarial text: ${findings.join(", ")}.`
    : `Suspicious text patterns: ${findings.join(", ")}.`;
}

// ─── Core Local Detection ─────────────────────────────────────────────────────

function localTextDetect(text) {
  if (!text || !text.trim()) {
    return {
      type: "text", is_adversarial: false, confidence: 0, threat_level: "LOW",
      summary: "Empty input.",
      scores: { confidence: 0, perturbation: 0, anomaly: 0, invisible: 0, homoglyph: 0, unicodeMix: 0, encoded: 0, url: 0, combined: 0 },
    };
  }

  const input = text.length > 5000 ? text.slice(0, 5000) : text;

  const rawConf    = modelConfidence(input);
  const conf       = parseFloat((1 - rawConf).toFixed(4));
  const perturbation = parseFloat(perturbationScore(input).toFixed(4));
  const anomaly    = parseFloat(anomalyScore(input).toFixed(4));
  const invisible  = parseFloat(invisibleCharScore(input).toFixed(4));
  const homoglyph  = parseFloat(homoglyphScore(input).toFixed(4));
  const unicodeMix = parseFloat(unicodeMixingScore(input).toFixed(4));
  const encoded    = parseFloat(encodedPayloadScore(input).toFixed(4));
  const url        = parseFloat(suspiciousUrlScore(input).toFixed(4));

  // Weighted ensemble — invisible chars, homoglyphs, encoded payloads get high weight
  const combined = parseFloat(Math.min(1, (
    0.12 * conf +
    0.08 * perturbation +
    0.20 * anomaly +
    0.20 * invisible +
    0.15 * homoglyph +
    0.10 * unicodeMix +
    0.10 * encoded +
    0.05 * url
  )).toFixed(4));

  const threat_level = classifyThreat(combined);
  const scores = { confidence: conf, perturbation, anomaly, invisible, homoglyph, unicodeMix, encoded, url, combined };

  return {
    type: "text",
    is_adversarial: combined >= 0.30,
    confidence: combined,
    threat_level,
    summary: generateSummary(scores, threat_level, input),
    scores,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function detectTextAdversarial(text) {
  const url = BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${url}/api/v1/text-detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Backend error: ${res.status}`);
  return res.json();
}