const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://neuro-defender.onrender.com";

function dct8(a) {
  const N = 8;
  const out = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += a[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    out[k] = sum * (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N));
  }
  return out;
}

function dct8x8(block) {
  const tmp = [];
  for (let r = 0; r < 8; r++) tmp.push(dct8(block.slice(r * 8, r * 8 + 8)));
  const out = new Float64Array(64);
  for (let c = 0; c < 8; c++) {
    const col = new Float64Array(8);
    for (let r = 0; r < 8; r++) col[r] = tmp[r][c];
    const d = dct8(col);
    for (let r = 0; r < 8; r++) out[r * 8 + c] = d[r];
  }
  return out;
}

function pixelIntegrityScore(data, len) {
  const histR = new Int32Array(256);
  const histG = new Int32Array(256);
  let sumR = 0, sumG = 0, sumB = 0;
  let sumGray = 0, sumGraySq = 0;

  for (let i = 0; i < len; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    histR[r]++; histG[g]++;
    sumR += r; sumG += g; sumB += b;
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    sumGray += gray; sumGraySq += gray * gray;
  }

  const mR = sumR / len, mG = sumG / len, mB = sumB / len;
  const imbalance = Math.min(1, (Math.abs(mR - mG) + Math.abs(mG - mB) + Math.abs(mR - mB)) / 150);

  let spikeSum = 0;
  for (let i = 1; i < 255; i++) {
    spikeSum += Math.abs(histR[i] - (histR[i - 1] + histR[i + 1]) / 2);
    spikeSum += Math.abs(histG[i] - (histG[i - 1] + histG[i + 1]) / 2);
  }
  const spikiness = Math.min(1, (spikeSum / (len * 2)) * 14);

  const meanGray = sumGray / len;
  const stdGray = Math.sqrt(Math.max(0, sumGraySq / len - meanGray * meanGray));
  let kurtSum = 0;
  for (let i = 0; i < len; i++) {
    const gray = data[i*4]*0.299 + data[i*4+1]*0.587 + data[i*4+2]*0.114;
    kurtSum += Math.pow((gray - meanGray) / (stdGray || 1), 4);
  }
  const excessKurt = Math.abs(kurtSum / len - 3);
  const kurtScore = Math.min(1, excessKurt / 8);

  const score = 0.35 * spikiness + 0.35 * imbalance + 0.30 * kurtScore;
  return { score: parseFloat(Math.min(1, score).toFixed(4)), mean: meanGray, std: stdGray };
}

function lsbAnalysisScore(data, len) {
  const pairs = [0, 0, 0, 0]; // 00, 01, 10, 11
  let runLen = 1;
  const runs = [];
  let lsbSum = 0;

  for (let i = 0; i < len; i++) {
    const lsb = data[i * 4] & 1;
    lsbSum += lsb;
    if (i < len - 1) {
      const nextLsb = data[(i + 1) * 4] & 1;
      pairs[lsb * 2 + nextLsb]++;
      if (nextLsb === lsb) {
        runLen++;
      } else {
        runs.push(runLen);
        runLen = 1;
      }
    }
  }
  runs.push(runLen);

  const lsbRatio = lsbSum / len;
  const total = pairs[0] + pairs[1] + pairs[2] + pairs[3];

  const expectedTransition = total / 2;
  const chiSq = total > 0
    ? (Math.pow(pairs[0] + pairs[3] - expectedTransition / 2, 2) / (expectedTransition / 2) +
       Math.pow(pairs[1] + pairs[2] - expectedTransition, 2) / expectedTransition) / total
    : 0;
  const chiScore = Math.min(1, chiSq * 8);

  const runCounts = {};
  for (const r of runs) runCounts[r] = (runCounts[r] || 0) + 1;
  const totalRuns = runs.length;
  let rleEntropy = 0;
  for (const c of Object.values(runCounts)) {
    const p = c / totalRuns;
    rleEntropy -= p * Math.log2(p);
  }
  const maxPossibleEntropy = Math.log2(Math.max(2, totalRuns));
  const rleScore = Math.min(1, rleEntropy / (maxPossibleEntropy || 1));

  const ratioDeviation = Math.max(0, 0.5 - Math.abs(lsbRatio - 0.5)); // higher = closer to 0.5
  const ratioScore = Math.min(1, ratioDeviation * 5);

  return parseFloat(Math.min(1, 0.40 * chiScore + 0.35 * rleScore + 0.25 * ratioScore).toFixed(4));
}

function frequencyDomainScore(data, w, h) {
  const bs = 8;
  let acEnergySum = 0, blockCount = 0;
  const dcVals = [];
  const block = new Float64Array(64);

  for (let by = 0; by + bs <= h; by += bs) {
    for (let bx = 0; bx + bs <= w; bx += bs) {
      for (let r = 0; r < bs; r++) {
        for (let c = 0; c < bs; c++) {
          const idx = ((by + r) * w + (bx + c)) * 4;
          block[r * bs + c] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114 - 128;
        }
      }

      const dctCoefs = dct8x8(block);

      const dc = dctCoefs[0];
      dcVals.push(dc);

      let acEnergy = 0;
      for (let k = 1; k < 64; k++) acEnergy += dctCoefs[k] * dctCoefs[k];
      acEnergySum += acEnergy;
      blockCount++;
    }
  }

  if (blockCount === 0) return 0;

  const avgAC = acEnergySum / blockCount;
  const acScore = Math.min(1, avgAC / 4000);

  let boundaryDisc = 0, boundaryCount = 0;
  for (let by = bs; by < h - bs; by += bs) {
    for (let x = 0; x < w; x++) {
      const above = data[((by - 1) * w + x) * 4] * 0.299 + data[((by - 1) * w + x) * 4 + 1] * 0.587 + data[((by - 1) * w + x) * 4 + 2] * 0.114;
      const below = data[(by * w + x) * 4] * 0.299 + data[(by * w + x) * 4 + 1] * 0.587 + data[(by * w + x) * 4 + 2] * 0.114;
      boundaryDisc += Math.abs(above - below);
      boundaryCount++;
    }
  }
  let interiorDisc = 0, interiorCount = 0;
  for (let y = 1; y < h - 1; y++) {
    if (y % bs === 0) continue; // skip block boundaries
    for (let x = 0; x < w; x++) {
      const above = data[((y - 1) * w + x) * 4] * 0.299 + data[((y - 1) * w + x) * 4 + 1] * 0.587 + data[((y - 1) * w + x) * 4 + 2] * 0.114;
      const cur   = data[(y * w + x) * 4] * 0.299 + data[(y * w + x) * 4 + 1] * 0.587 + data[(y * w + x) * 4 + 2] * 0.114;
      interiorDisc += Math.abs(above - cur);
      interiorCount++;
    }
  }
  const avgBoundary = boundaryDisc / (boundaryCount || 1);
  const avgInterior = interiorDisc / (interiorCount || 1);
  const blockingScore = Math.min(1, Math.max(0, (avgBoundary / (avgInterior || 1) - 1) * 0.5));

  return parseFloat(Math.min(1, 0.55 * acScore + 0.45 * blockingScore).toFixed(4));
}

function edgeTextureScore(data, w, h) {
  const sobelMap = new Float32Array(w * h);
  let totalEdge = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const g = (py, px) => {
        const idx = (py * w + px) * 4;
        return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      };
      const tl = g(y-1,x-1), tc = g(y-1,x), tr = g(y-1,x+1);
      const ml = g(y,x-1),                   mr = g(y,x+1);
      const bl = g(y+1,x-1), bc = g(y+1,x), br = g(y+1,x+1);
      const gx = -tl - 2*ml - bl + tr + 2*mr + br;
      const gy = -tl - 2*tc - tr + bl + 2*bc + br;
      const mag = Math.sqrt(gx*gx + gy*gy);
      sobelMap[y * w + x] = mag;
      totalEdge += mag;
    }
  }

  let isolatedEdgeEnergy = 0;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const mag = sobelMap[y * w + x];
      if (mag > 80) {
        const neighborAvg = (sobelMap[(y-1)*w+x] + sobelMap[(y+1)*w+x] +
                             sobelMap[y*w+(x-1)] + sobelMap[y*w+(x+1)]) / 4;
        if (neighborAvg < 25) isolatedEdgeEnergy += mag;
      }
    }
  }
  const edgeScore = Math.min(1, isolatedEdgeEnergy / Math.max(1, totalEdge * 0.20));

  const ps = 16;
  const patchStds = [];
  for (let py = 0; py + ps < h; py += ps) {
    for (let px = 0; px + ps < w; px += ps) {
      let s = 0, sq = 0;
      for (let y = py; y < py + ps; y++)
        for (let x = px; x < px + ps; x++) {
          const idx = (y * w + x) * 4;
          const v = data[idx]*0.299 + data[idx+1]*0.587 + data[idx+2]*0.114;
          s += v; sq += v * v;
        }
      const cnt = ps * ps;
      const mean = s / cnt;
      patchStds.push(Math.sqrt(Math.max(0, sq / cnt - mean * mean)));
    }
  }
  const psMean = patchStds.reduce((a, b) => a + b, 0) / (patchStds.length || 1);
  const psVar = patchStds.reduce((s, v) => s + Math.pow(v - psMean, 2), 0) / (patchStds.length || 1);
  const textureScore = Math.min(1, psVar / 500);

  return parseFloat(Math.min(1, 0.50 * edgeScore + 0.50 * textureScore).toFixed(4));
}

function noiseForensicsScore(data, w, h) {
  let residualSum = 0, residualSumSq = 0, count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const v = data[(y*w+x)*4+c];
        const avg = (data[((y-1)*w+x)*4+c] + data[((y+1)*w+x)*4+c] +
                     data[(y*w+(x-1))*4+c] + data[(y*w+(x+1))*4+c]) / 4;
        const res = v - avg;
        residualSum += res;
        residualSumSq += res * res;
        count++;
      }
    }
  }

  const noiseMean = residualSum / count;
  const noiseStd = Math.sqrt(Math.max(0, residualSumSq / count - noiseMean * noiseMean));

  const injectedScore = Math.min(1, Math.max(0, (noiseStd - 9) / 18));
  const denoisedScore = Math.min(1, Math.max(0, (1.5 - noiseStd) / 1.5));

  const ps = 16;
  const patchNoiseStds = [];
  for (let py = 0; py + ps < h; py += ps) {
    for (let px = 0; px + ps < w; px += ps) {
      let s = 0, sq = 0, cnt = 0;
      for (let y = py; y < py + ps && y < h - 1; y++) {
        for (let x = px; x < px + ps && x < w - 1; x++) {
          for (let c = 0; c < 3; c++) {
            const v = data[(y*w+x)*4+c];
            const avg = (data[((y-1)*w+x)*4+c] + data[((y+1)*w+x)*4+c] +
                         data[(y*w+(x-1))*4+c] + data[(y*w+(x+1))*4+c]) / 4;
            const res = v - avg;
            s += res; sq += res * res; cnt++;
          }
        }
      }
      if (cnt > 0) {
        const m = s / cnt;
        patchNoiseStds.push(Math.sqrt(Math.max(0, sq / cnt - m * m)));
      }
    }
  }
  const pnMean = patchNoiseStds.reduce((a, b) => a + b, 0) / (patchNoiseStds.length || 1);
  const pnStdDev = Math.sqrt(
    patchNoiseStds.reduce((s, v) => s + Math.pow(v - pnMean, 2), 0) / (patchNoiseStds.length || 1)
  );
  const noiseCoV = pnMean > 0 ? pnStdDev / pnMean : 0;
  const inconsistencyScore = Math.min(1, noiseCoV * 1.5);

  return parseFloat(Math.min(1, 0.35 * injectedScore + 0.25 * denoisedScore + 0.40 * inconsistencyScore).toFixed(4));
}

function featureSqueezeScore(data, len) {
  let l1Diff = 0;
  let lInfDiff = 0;
  let l1Diff2bit = 0;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      const sq3 = Math.round(v / 32) * 32;
      const d3 = Math.abs(v - sq3);
      l1Diff += d3;
      if (d3 > lInfDiff) lInfDiff = d3;
      const sq2 = Math.round(v / 64) * 64;
      l1Diff2bit += Math.abs(v - sq2);
    }
  }

  const channels = len * 3;
  const l1Score = Math.min(1, (l1Diff / channels) / 12);
  const lInfScore = Math.min(1, lInfDiff / 16);
  const l1_2bit = Math.min(1, (l1Diff2bit / channels) / 28);

  return parseFloat(Math.min(1, 0.35 * l1Score + 0.40 * lInfScore + 0.25 * l1_2bit).toFixed(4));
}

function reconstructionScore(data, w, h) {
  let laplacianSumSq = 0;
  let laplacianMean = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const center = data[(y * w + x) * 4 + c];
        const lap =
          -4 * center +
          data[((y-1)*w+x)*4+c] +
          data[((y+1)*w+x)*4+c] +
          data[(y*w+(x-1))*4+c] +
          data[(y*w+(x+1))*4+c];
        laplacianMean += lap;
        laplacianSumSq += lap * lap;
        count++;
      }
    }
  }

  const mean = laplacianMean / count;
  const lapMSE = laplacianSumSq / count - mean * mean; // variance of Laplacian

  return parseFloat(Math.min(1, lapMSE / 800).toFixed(4));
}

function metadataScore(image) {
  let score = 0;
  const w = image.naturalWidth, h = image.naturalHeight;
  if (!w || !h) return 0;

  if (w % 64 === 0 && h % 64 === 0) score += 0.20;
  if (w === h) score += 0.15;
  const ratio = w / h;
  const commonRatios = [1.0, 4/3, 3/2, 16/9, 2.0, 9/16, 3/4];
  if (w >= 512 && commonRatios.some(r => Math.abs(ratio - r) < 0.002)) score += 0.10;

  return parseFloat(Math.min(1, score).toFixed(4));
}

function classifyThreat(score) {
  if (score > 0.65) return "HIGH";
  if (score > 0.40) return "MEDIUM";
  if (score > 0.20) return "LOW";
  return "SAFE";
}

function generateSummary(scores, threatLevel) {
  if (threatLevel === "SAFE") return "All 8 forensic modules pass. No manipulation signals detected.";
  if (threatLevel === "LOW")  return "Minor statistical anomalies. Likely standard processing (resize/compress). No strong manipulation evidence.";

  const labels = {
    pixel:          "pixel histogram / channel distribution anomaly",
    lsb:            "LSB bit-stream irregularity (steganography indicator)",
    frequency:      "DCT block AC energy spike or blocking artifact",
    edge:           "isolated edge / texture region inconsistency",
    noise:          "spatially inconsistent or injected noise pattern",
    squeeze:        "feature-squeeze L∞ perturbation residual",
    reconstruction: "high Laplacian energy (high-frequency anomaly)",
    metadata:       "suspicious image dimensions (AI-generation heuristic)",
  };

  const topTwo = Object.entries(scores)
    .filter(([k]) => k !== "combined")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => labels[k] || k);

  return threatLevel === "HIGH"
    ? `High-confidence forensic threat: ${topTwo.join(" + ")}.`
    : `Suspicious forensic signals: ${topTwo.join(" + ")}.`;
}

function localDetect(image) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const maxDim = 512;
    const scale = Math.min(maxDim / (image.naturalWidth || 1), maxDim / (image.naturalHeight || 1), 1);
    canvas.width  = Math.max(1, Math.floor((image.naturalWidth  || 1) * scale));
    canvas.height = Math.max(1, Math.floor((image.naturalHeight || 1) * scale));
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const len = canvas.width * canvas.height;
    const w = canvas.width, h = canvas.height;

    const pixelResult    = pixelIntegrityScore(data, len);
    const lsb            = lsbAnalysisScore(data, len);
    const frequency      = frequencyDomainScore(data, w, h);
    const edge           = edgeTextureScore(data, w, h);
    const noise          = noiseForensicsScore(data, w, h);
    const squeeze        = featureSqueezeScore(data, len);
    const reconstruction = reconstructionScore(data, w, h);
    const metadata       = metadataScore(image);

    const scores = { pixel: pixelResult.score, lsb, frequency, edge, noise, squeeze, reconstruction, metadata };

    scores.combined = parseFloat(Math.min(1, (
      0.14 * scores.pixel        +  // histogram / channel stats
      0.22 * scores.lsb          +  // steganography / bit-level attack
      0.14 * scores.frequency    +  // DCT artifact / adversarial HF noise
      0.12 * scores.edge         +  // splice / clone-stamp
      0.12 * scores.noise        +  // noise injection / inconsistency
      0.10 * scores.squeeze      +  // perturbation residual after squeezing
      0.10 * scores.reconstruction + // Laplacian energy proxy
      0.06 * scores.metadata        // dimension heuristics (weakest signal)
    )).toFixed(4));

    const threat_level = classifyThreat(scores.combined);
    resolve({
      type: "image",
      is_adversarial: scores.combined > 0.20,
      is_threat: scores.combined > 0.40,
      confidence: scores.combined,
      threat_level,
      summary: generateSummary(scores, threat_level),
      scores,
      stats: { mean: pixelResult.mean, std: pixelResult.std },
    });
  });
}

export async function detectAdversarial(image, originalFile = null) {
  try {
    if (!BACKEND_URL) {
      throw new Error("Backend URL not configured");
    }

    const form = new FormData();

    if (originalFile instanceof File) {
      form.append("image", originalFile);
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || 1;
      canvas.height = image.naturalHeight || 1;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      form.append("image", blob);
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/detect`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("❌ IMAGE API FAILED:", err);

    return {
      type: "image",
      is_adversarial: false,
      confidence: 0,
      threat_level: "LOW",
      summary: "Backend not responding",
      scores: {},
    };
  }
}

export async function simulateFGSM(image, epsilon = 0.05) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width  = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    const originalDataUrl = canvas.toDataURL("image/png");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const w = canvas.width, h = canvas.height;
    const perturbed = new Uint8ClampedArray(data);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const left  = data[(y * w + (x-1)) * 4 + c];
          const right = data[(y * w + (x+1)) * 4 + c];
          const up    = data[((y-1) * w + x) * 4 + c];
          const down  = data[((y+1) * w + x) * 4 + c];
          const gradSign = Math.sign((right - left) + (down - up));
          perturbed[idx + c] = Math.max(0, Math.min(255, data[idx + c] + gradSign * epsilon * 255));
        }
      }
    }

    imageData.data.set(perturbed);
    ctx.putImageData(imageData, 0, 0);
    resolve({ originalDataUrl, adversarialDataUrl: canvas.toDataURL("image/png"), epsilon });
  });
}
