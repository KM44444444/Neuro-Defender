import re
import math

# ─── Text Analysis Helpers ────────────────────────────────────────────────────

ZERO_WIDTH_CODEPOINTS = {
    0x200B, 0x200C, 0x200D, 0x200E, 0x200F,
    0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
    0xFEFF, 0x00AD, 0x034F, 0x115F, 0x1160, 0x3164,
}

HOMOGLYPH_SET = set("аеорсхуіїёъьαεορτυχａｂｃｄｅｆｇ@35$7!")

URL_PATTERN = re.compile(
    r'https?://[^\s]+|www\.[^\s]+'
    r'|\b\w+\.(ru|cn|tk|ml|ga|cf|gq|xyz|top|work|click|online|site|fun|pw|cc)\b',
    re.IGNORECASE
)
BASE64_PATTERN = re.compile(r'[A-Za-z0-9+/]{20,}={0,2}')
HEX_PATTERN = re.compile(r'(?:0x)?[0-9a-fA-F]{8,}')
SCRIPT_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in
    [r'<script', r'javascript:', r'on\w+=', r'eval\s*\(', r'document\.', r'window\.', r'alert\s*\(', r'fetch\s*\(']
]

def _entropy(text: str) -> float:
    if not text: return 0.0
    freq: dict = {}
    for ch in text: freq[ch] = freq.get(ch, 0) + 1
    n = len(text)
    return -sum((c/n) * math.log2(c/n) for c in freq.values())

def _model_confidence(text: str) -> float:
    if not text: return 1.0
    max_e = math.log2(min(len(text), 95)) if len(text) > 1 else 1.0
    norm_e = min(1.0, _entropy(text) / max_e)
    lp = 0.3 if len(text) < 5 else 0.0
    return max(0.0, 1.0 - norm_e * 0.7 - lp)

def _normalize_text(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z\s]', ' ', text.lower())).strip()

def _perturbation_score(text: str) -> float:
    norm = _normalize_text(text)
    return min(1.0, abs(_model_confidence(text) - _model_confidence(norm or text)))

def _anomaly_ratio(text: str) -> float:
    if not text: return 0.0
    n = len(text)
    special  = sum(1 for ch in text if not re.match(r'^[a-zA-Z ]$', ch))
    repeated = sum(1 for i in range(1, n) if text[i] == text[i-1])
    numeric  = sum(1 for ch in text if ch.isdigit())
    mixed    = sum(len(w) for w in text.split()
                   if re.search(r'[a-zA-Z]', w) and re.search(r'[^a-zA-Z]', w) and len(w) > 1)
    lf = 1.5 if n < 20 else 0.85 if n > 500 else 1.0
    raw = (special * 1.0 + repeated * 0.8 + numeric * 0.9 + mixed * 1.5) / n
    return min(1.0, raw * lf)

def _invisible_char_score(text: str) -> float:
    count = sum(1 for ch in text if ord(ch) in ZERO_WIDTH_CODEPOINTS
                or (0x2000 <= ord(ch) <= 0x206F)
                or (0xE000 <= ord(ch) <= 0xF8FF))
    return min(1.0, count / max(1, len(text) * 0.01) * 0.8 + (0.4 if count > 0 else 0))

def _homoglyph_score(text: str) -> float:
    hits = sum(1 for ch in text if ch in HOMOGLYPH_SET)
    return min(1.0, hits / max(1, len(text)) * 4)

def _unicode_mixing_score(text: str) -> float:
    def block(cp):
        if cp < 0x0080: return 'latin'
        if cp < 0x0250: return 'latin-ext'
        if 0x0400 <= cp < 0x0500: return 'cyrillic'
        if 0x0370 <= cp < 0x0400: return 'greek'
        if 0x4E00 <= cp < 0xA000: return 'cjk'
        if 0x0600 <= cp < 0x0700: return 'arabic'
        return 'other'
    transitions = 0
    prev = None
    for ch in text:
        if ch.isspace(): continue
        b = block(ord(ch))
        if prev and b != prev and b != 'other' and prev != 'other':
            transitions += 1
        prev = b
    return min(1.0, transitions / max(1, len(text) / 10) * 0.8)

def _url_score(text: str) -> float:
    urls = URL_PATTERN.findall(text)
    if not urls: return 0.0
    susp = sum(1 for u in urls if re.search(r'\.(ru|cn|tk|ml|ga|cf|gq|xyz|top|click|pw|cc)', str(u), re.I))
    return min(1.0, 0.3 * len(urls) + 0.5 * susp)

def _encoded_payload_score(text: str) -> float:
    score = 0.0
    score += min(0.4, len(BASE64_PATTERN.findall(text)) * 0.15)
    score += min(0.3, len(HEX_PATTERN.findall(text)) * 0.1)
    if any(p.search(text) for p in SCRIPT_PATTERNS):
        score += 0.4
    return min(1.0, score)

def _generate_text_summary(scores: dict, threat: str) -> str:
    if threat == "LOW":
        return "No adversarial patterns detected. Text appears clean."
    findings = []
    if scores.get("invisible", 0) > 0.1:   findings.append("zero-width/invisible characters")
    if scores.get("homoglyph", 0) > 0.1:   findings.append("homoglyph substitution attack")
    if scores.get("unicodeMix", 0) > 0.1:  findings.append("unicode script mixing")
    if scores.get("encoded", 0) > 0.1:     findings.append("encoded payload detected")
    if scores.get("url", 0) > 0.1:         findings.append("suspicious URL pattern")
    if scores.get("anomaly", 0) > 0.4:     findings.append("heavy character obfuscation")
    if not findings: findings.append("character-level anomalies")
    return (
        f"High-risk adversarial text: {', '.join(findings)}."
        if threat == "HIGH"
        else f"Suspicious text patterns: {', '.join(findings)}."
    )

