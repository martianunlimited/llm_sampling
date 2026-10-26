/**
 * LLM Sampling & Decoding Playground - Interactive Client-Side Engine
 * Visualizing Softmax, Temperature, Top-K, Top-P (Nucleus), Min-P,
 * Repetition Penalty, Greedy, and Beam Search.
 */

// Fallback educational presets
const FALLBACK_PRESETS = [
  {
    "id": "factual-paris",
    "title": "Factual Recall: The Capital of France",
    "category": "Factual Recall",
    "prompt": "The capital of France is",
    "description": "Low entropy factual query where truth has overwhelming probability.",
    "explanation": "In factual questions with a single unambiguous answer, the output distribution has extremely low entropy. 'Paris' dominates with a massive logit score. Setting temperature low (e.g., T=0.1) or using Greedy Search yields reliable precision, whereas high temperature causes hallucinations.",
    "recommended_temp": 0.1,
    "recommended_top_k": 5,
    "recommended_top_p": 0.90,
    "recommended_rep_pen": 1.0,
    "candidates": {
      "Paris": 13.8,
      "Lyon": 6.2,
      "Marseille": 5.8,
      "London": 4.5,
      "the": 3.8,
      "located": 2.5,
      "known": 1.9,
      "a": 1.2,
      "beautiful": 0.5,
      "pizza": -3.2,
      "banana": -4.8,
      "1994": -5.5
    }
  },
  {
    "id": "creative-forest",
    "title": "Creative Storytelling: The Enchanted Forest",
    "category": "Creative Storytelling",
    "prompt": "Deep in the enchanted forest, the ancient wizard discovered a",
    "description": "High entropy open-ended creative continuation with diverse valid options.",
    "explanation": "In creative writing, there is no single 'correct' next word. The probability mass is spread smoothly across magical artifacts, creatures, and mysterious portals. Greedy decoding picks predictable cliches ('glowing orb'), while Nucleus Sampling allows creative variety while filtering out incoherent tails.",
    "recommended_temp": 0.85,
    "recommended_top_k": 15,
    "recommended_top_p": 0.92,
    "recommended_rep_pen": 1.1,
    "candidates": {
      "glowing": 8.4,
      "mysterious": 8.1,
      "hidden": 7.9,
      "crystal": 7.6,
      "secret": 7.3,
      "portal": 7.0,
      "book": 6.8,
      "sword": 6.5,
      "magical": 6.3,
      "strange": 6.1,
      "forgotten": 5.9,
      "golden": 5.7,
      "dragon": 5.5,
      "door": 5.2,
      "cave": 4.9,
      "refrigerator": -1.5,
      "tax": -3.8,
      "spreadsheet": -4.6
    }
  },
  {
    "id": "repetition-loop",
    "title": "Degenerative Repetition Loop: Chasing Dogs",
    "category": "Repetitive Loop",
    "prompt": "The dog chased the cat and then the cat chased the dog and then",
    "description": "Demonstrating greedy search loops and how repetition penalty breaks them.",
    "explanation": "Transformers without repetition penalties often get trapped in infinite degenerative self-reinforcing loops. Because 'the dog chased the cat and then' appeared in the context, the model assigns maximum probability to 'the dog'. Raising Repetition Penalty artificially discounts repeated tokens, forcing the model to break the cycle and introduce fresh progression.",
    "recommended_temp": 0.7,
    "recommended_top_k": 10,
    "recommended_top_p": 0.90,
    "recommended_rep_pen": 1.35,
    "candidates": {
      "the": 11.2,
      "a": 5.4,
      "both": 4.8,
      "they": 4.5,
      "suddenly": 4.1,
      "it": 3.8,
      "finally": 3.5,
      "everything": 2.8,
      "stopped": 2.2,
      "ran": 1.7
    }
  },
  {
    "id": "code-binary-search",
    "title": "Code Completion: Binary Search Implementation",
    "category": "Code Completion",
    "prompt": "def binary_search(arr, target):\n    low = 0\n    high = len(arr) - 1\n    while low <= high:\n        mid =",
    "description": "Strict deterministic code syntax where exact formula tokens are required.",
    "explanation": "Programming code generation demands near-deterministic precision. For calculating the middle index, '(low + high) // 2' is universally expected. Any sampling randomness (high temperature) introduces fatal syntax bugs or incorrect array logic. Code models typically run at T <= 0.2 with top_p <= 0.95.",
    "recommended_temp": 0.2,
    "recommended_top_k": 5,
    "recommended_top_p": 0.85,
    "recommended_rep_pen": 1.0,
    "candidates": {
      " (low + high) // 2": 12.8,
      " low + (high - low) // 2": 11.4,
      " (low + high) / 2": 6.8,
      " int((low + high) / 2)": 5.9,
      " low": 3.2,
      " random.randint(low, high)": -1.2,
      " 'error'": -4.0
    }
  },
  {
    "id": "bimodal-baseball",
    "title": "Contextual Bimodal Split: The Batter's Swing",
    "category": "Bimodal Polysemy",
    "prompt": "The baseball player stepped up to the plate and swung his",
    "description": "Bi-modal distribution with high probability focused on domain equipment.",
    "explanation": "When the sentence context provides strong domain constraints ('baseball player', 'plate'), the model eliminates general nouns and concentrates probability on 'bat' with secondary candidates describing the swing style ('arms', 'body'). Nucleus sampling (top_p = 0.90) cleanly clips off irrelevant words.",
    "recommended_temp": 0.7,
    "recommended_top_k": 8,
    "recommended_top_p": 0.90,
    "recommended_rep_pen": 1.0,
    "candidates": {
      "bat": 12.5,
      "wooden": 6.8,
      "arms": 5.4,
      "body": 4.2,
      "helmet": 3.1,
      "glove": 2.5,
      "sword": -1.5,
      "wand": -3.2,
      "guitar": -4.0
    }
  }
];

// App State
const state = {
  presets: FALLBACK_PRESETS,
  activePresetId: "factual-paris",
  currentPrompt: "The capital of France is",
  generatedTokens: [],
  temperature: 0.80,
  top_k: 10,
  top_p: 0.90,
  min_p: 0.0,
  repetition_penalty: 1.00,
  distributionResult: null,
  activeCandidateHover: null
};

// Simulated continuation library for multi-step generation
const CONTINUATIONS = {
  "Paris": {
    ",": 8.5,
    "is": 7.2,
    "was": 5.1,
    "and": 4.2,
    "in": 3.1
  },
  ",": {
    "which": 9.2,
    "the": 7.5,
    "located": 6.1,
    "known": 5.4,
    "a": 4.0
  },
  "which": {
    "is": 11.4,
    "has": 6.2,
    "was": 5.1,
    "attracts": 4.8
  },
  "is": {
    "known": 9.5,
    "famous": 8.8,
    "the": 7.2,
    "located": 6.5,
    "home": 5.9
  },
  "glowing": {
    "crystal": 9.1,
    "orb": 8.8,
    "portal": 7.9,
    "sword": 6.5,
    "light": 5.4
  },
  "the": {
    "cat": 9.5,
    "dog": 8.8,
    "ancient": 6.5,
    "most": 5.2
  }
};

// ============================================================================
// Core Sampling Math (Client-Side)
// ============================================================================

function applyRepetitionPenalty(logits, contextTokens, penalty) {
  if (penalty <= 1.0 || !contextTokens || contextTokens.length === 0) {
    return { ...logits };
  }

  const contextSet = new Set(contextTokens.map(t => t.trim().toLowerCase()).filter(Boolean));
  const penalized = {};

  for (const [tok, val] of Object.entries(logits)) {
    const cleanTok = tok.trim().toLowerCase();
    if (contextSet.has(cleanTok)) {
      penalized[tok] = val > 0 ? (val / penalty) : (val * penalty);
    } else {
      penalized[tok] = val;
    }
  }

  return penalized;
}

function computeSoftmax(logits, temperature = 1.0) {
  const t = Math.max(0.01, temperature);
  const values = Object.values(logits);
  if (values.length === 0) return {};

  const maxVal = Math.max(...values);
  const expMap = {};
  let sumExp = 0.0;

  for (const [tok, val] of Object.entries(logits)) {
    const e = Math.exp((val - maxVal) / t);
    expMap[tok] = e;
    sumExp += e;
  }

  const probs = {};
  for (const [tok, e] of Object.entries(expMap)) {
    probs[tok] = sumExp > 0 ? (e / sumExp) : (1.0 / values.length);
  }
  return probs;
}

function processDistribution(prompt, rawLogits, params) {
  const contextTokens = prompt.split(/\s+/);

  // 1. Repetition penalty
  const penalizedLogits = applyRepetitionPenalty(rawLogits, contextTokens, params.repetition_penalty);

  // 2. Softmax with Temperature
  const rawProbs = computeSoftmax(penalizedLogits, params.temperature);

  // Sort descending by raw probability
  const sortedTokens = Object.entries(rawProbs).sort((a, b) => b[1] - a[1]);
  const argmaxToken = sortedTokens.length > 0 ? sortedTokens[0][0] : "";

  // 3. Filter flags & reasons
  const filterReasons = {};
  const keptTokens = new Set();

  let cumSum = 0.0;
  const maxP = sortedTokens.length > 0 ? sortedTokens[0][1] : 1.0;
  const minPCutoff = params.min_p * maxP;

  sortedTokens.forEach(([tok, p], rank) => {
    let isFiltered = false;

    // Top-K check
    if (params.top_k > 0 && rank >= params.top_k) {
      isFiltered = true;
      filterReasons[tok] = `Top-k cutoff (rank > ${params.top_k})`;
    }

    // Top-P Nucleus check
    if (!isFiltered) {
      if (cumSum >= params.top_p && rank > 0) {
        isFiltered = true;
        filterReasons[tok] = `Top-p nucleus (threshold > ${(params.top_p * 100).toFixed(0)}%)`;
      } else {
        cumSum += p;
      }
    }

    // Min-P check
    if (!isFiltered && params.min_p > 0 && p < minPCutoff && rank > 0) {
      isFiltered = true;
      filterReasons[tok] = `Min-p cutoff (< ${(params.min_p * 100).toFixed(0)}% of max)`;
    }

    if (!isFiltered) {
      keptTokens.add(tok);
    }
  });

  // Ensure at least argmax token survives
  if (keptTokens.size === 0 && sortedTokens.length > 0) {
    keptTokens.add(sortedTokens[0][0]);
    delete filterReasons[sortedTokens[0][0]];
  }

  // 4. Renormalize surviving probabilities
  let survivingSum = 0.0;
  for (const tok of keptTokens) {
    survivingSum += rawProbs[tok];
  }

  const renormProbs = {};
  for (const tok of keptTokens) {
    renormProbs[tok] = survivingSum > 0 ? (rawProbs[tok] / survivingSum) : 1.0;
  }

  // 5. Build full candidate array with cumulative distribution
  let runningCum = 0.0;
  const candidates = sortedTokens.map(([tok, rawP]) => {
    const isFiltered = !keptTokens.has(tok);
    const finalP = isFiltered ? 0.0 : renormProbs[tok];
    if (!isFiltered) runningCum += finalP;

    return {
      token: tok,
      raw_logit: rawLogits[tok] || 0.0,
      penalized_logit: penalizedLogits[tok] || 0.0,
      raw_prob: rawP,
      filtered: isFiltered,
      filter_reason: filterReasons[tok] || "",
      final_prob: finalP,
      cumulative_prob: isFiltered ? 0.0 : Math.min(1.0, runningCum)
    };
  });

  // 6. Compute Entropy
  let entropy = 0.0;
  for (const p of Object.values(renormProbs)) {
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
  }

  return {
    prompt,
    candidates,
    entropy,
    argmax_token: argmaxToken,
    surviving_count: keptTokens.size
  };
}

function sampleFromCandidates(candidates, forcedRoll = null) {
  const surviving = candidates.filter(c => !c.filtered && c.final_prob > 0);
  if (surviving.length === 0) return candidates[0] ? candidates[0].token : "";

  const roll = (forcedRoll !== null) ? forcedRoll : Math.random();
  let cumulative = 0.0;

  for (const c of surviving) {
    cumulative += c.final_prob;
    if (roll <= cumulative) {
      return { token: c.token, roll };
    }
  }

  return { token: surviving[surviving.length - 1].token, roll };
}

// ============================================================================
// UI Renderers
// ============================================================================

function renderDistributionBars() {
  const container = document.getElementById("candidate-bars-container");
  container.innerHTML = "";

  const result = state.distributionResult;
  document.getElementById("entropy-val").textContent = `${result.entropy.toFixed(3)} bits`;

  result.candidates.forEach((c, idx) => {
    const item = document.createElement("div");
    const isArgmax = (c.token === result.argmax_token);
    item.className = `candidate-bar-item ${c.filtered ? "filtered" : ""} ${isArgmax ? "argmax" : ""}`;

    const percentVal = (c.final_prob * 100).toFixed(1);
    const rawPercentVal = (c.raw_prob * 100).toFixed(1);

    item.innerHTML = `
      <div class="bar-token-label">
        <span class="token-rank-num">#${idx + 1}</span>
        <strong>'${c.token}'</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${c.filtered ? Math.max(3, c.raw_prob * 100) : c.final_prob * 100}%;"></div>
      </div>
      <div class="bar-prob-val">
        ${c.filtered ? `<span style="font-size:0.68rem;opacity:0.8">${c.filter_reason.split(" ")[0]}</span>` : `${percentVal}%`}
      </div>
    `;

    item.addEventListener("mouseenter", () => updateMathInspector(c));
    container.appendChild(item);
  });
}

function updateMathInspector(c) {
  if (!c) return;
  document.getElementById("insp-tok-name").textContent = `'${c.token}'`;
  const statusEl = document.getElementById("insp-tok-status");

  if (c.filtered) {
    statusEl.textContent = `FILTERED (${c.filter_reason})`;
    statusEl.className = "math-tok-status filtered-status";
  } else {
    statusEl.textContent = "ACTIVE";
    statusEl.className = "math-tok-status";
  }

  document.getElementById("insp-raw-logit").textContent = c.raw_logit.toFixed(2);
  document.getElementById("insp-pen-logit").textContent = c.penalized_logit.toFixed(2);
  document.getElementById("insp-temp-scaled").textContent = (c.penalized_logit / state.temperature).toFixed(2);
  document.getElementById("insp-raw-prob").textContent = `${(c.raw_prob * 100).toFixed(2)}%`;
  document.getElementById("insp-final-prob").textContent = `${(c.final_prob * 100).toFixed(2)}%`;
  document.getElementById("insp-cum-prob").textContent = c.filtered ? "—" : `${(c.cumulative_prob * 100).toFixed(1)}%`;

  let note = "";
  if (c.filtered) {
    note = `⛔ This candidate was clipped by the decoding filters (${c.filter_reason}). Its probability mass was redistributed to surviving tokens.`;
  } else if (c.final_prob > 0.50) {
    note = `🌟 Dominant next-token candidate with ${(c.final_prob * 100).toFixed(1)}% of total surviving probability mass.`;
  } else {
    note = `✨ Active candidate in the sampling pool. When temperature is higher, this token has a realistic probability of being sampled.`;
  }
  document.getElementById("insp-math-note").textContent = note;
}

function renderProbabilityTape(activeRoll = null, activeWinner = null) {
  const tape = document.getElementById("probability-tape");
  tape.innerHTML = "";

  const candidates = state.distributionResult.candidates;
  const surviving = candidates.filter(c => !c.filtered && c.final_prob > 0);

  // Colors palette for tape slices
  const colors = [
    "#10b981", "#06b6d4", "#6366f1", "#8b5cf6",
    "#ec4899", "#f59e0b", "#3b82f6", "#14b8a6"
  ];

  surviving.forEach((c, idx) => {
    const slice = document.createElement("div");
    slice.className = "tape-slice";
    slice.style.width = `${c.final_prob * 100}%`;
    slice.style.backgroundColor = colors[idx % colors.length];
    slice.title = `'${c.token}': ${(c.final_prob * 100).toFixed(1)}%`;
    slice.textContent = (c.final_prob > 0.06) ? `'${c.token}'` : "·";
    tape.appendChild(slice);
  });

  if (activeRoll !== null) {
    const pointer = document.getElementById("tape-pointer");
    const percent = Math.min(99.5, Math.max(0.5, activeRoll * 100));
    pointer.style.left = `${percent}%`;
    document.getElementById("pointer-tag").textContent = `r = ${activeRoll.toFixed(3)}`;
    document.getElementById("roll-coord-display").textContent = activeRoll.toFixed(4);
    document.getElementById("roll-winner-display").textContent = `'${activeWinner}'`;
  }
}

function updateStrategiesDisplay() {
  const result = state.distributionResult;
  document.getElementById("strat-greedy-tok").textContent = `'${result.argmax_token}'`;

  // Simulate Nucleus roll
  const sampleRes = sampleFromCandidates(result.candidates);
  document.getElementById("strat-nucleus-tok").textContent = `'${sampleRes.token}'`;

  // Beam Search hypothesis
  const prefix = state.currentPrompt.split(/\s+/).slice(-2).join(" ");
  document.getElementById("strat-beam-tok").textContent = `'${result.argmax_token} , which is'`;
}

function renderPresetInsights(preset) {
  if (!preset) return;
  document.getElementById("scenario-title").textContent = preset.title;
  document.getElementById("scenario-explanation").textContent = preset.explanation;
}

function selectPreset(presetId) {
  const preset = state.presets.find(p => p.id === presetId);
  if (!preset) return;

  state.activePresetId = presetId;
  state.currentPrompt = preset.prompt;
  state.generatedTokens = [];
  state.temperature = preset.recommended_temp;
  state.top_k = preset.recommended_top_k;
  state.top_p = preset.recommended_top_p;
  state.repetition_penalty = preset.recommended_rep_pen;

  // Update controls UI
  document.getElementById("slider-temp").value = state.temperature;
  document.getElementById("val-temp").textContent = state.temperature.toFixed(2);

  document.getElementById("slider-top-k").value = state.top_k;
  document.getElementById("val-top-k").textContent = state.top_k;

  document.getElementById("slider-top-p").value = state.top_p;
  document.getElementById("val-top-p").textContent = state.top_p.toFixed(2);

  document.getElementById("slider-rep-pen").value = state.repetition_penalty;
  document.getElementById("val-rep-pen").textContent = state.repetition_penalty.toFixed(2);

  document.getElementById("prompt-display").textContent = preset.prompt;
  document.getElementById("stream-prompt-part").textContent = preset.prompt;
  document.getElementById("stream-generated-part").textContent = "";

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === presetId);
  });

  recomputeAndRender();
  renderPresetInsights(preset);
}

function recomputeAndRender() {
  const preset = state.presets.find(p => p.id === state.activePresetId) || state.presets[0];
  
  // If we have generated words, inspect continuation library
  let activeLogits = preset.candidates;
  if (state.generatedTokens.length > 0) {
    const lastWord = state.generatedTokens[state.generatedTokens.length - 1];
    activeLogits = CONTINUATIONS[lastWord] || preset.candidates;
  }

  const fullText = state.currentPrompt + " " + state.generatedTokens.join(" ");
  state.distributionResult = processDistribution(
    fullText,
    activeLogits,
    {
      temperature: state.temperature,
      top_k: state.top_k,
      top_p: state.top_p,
      min_p: state.min_p,
      repetition_penalty: state.repetition_penalty
    }
  );

  renderDistributionBars();
  
  // Set default inspector to argmax candidate
  if (state.distributionResult.candidates.length > 0) {
    updateMathInspector(state.distributionResult.candidates[0]);
  }

  renderProbabilityTape();
  updateStrategiesDisplay();
}

function executeDiceRoll() {
  const res = sampleFromCandidates(state.distributionResult.candidates);
  renderProbabilityTape(res.roll, res.token);
}

function stepNextWord() {
  const res = sampleFromCandidates(state.distributionResult.candidates);
  state.generatedTokens.push(res.token);
  document.getElementById("stream-generated-part").textContent = " " + state.generatedTokens.join(" ");
  recomputeAndRender();
}

let autoStreamInterval = null;
function toggleAutoStream() {
  const btn = document.getElementById("auto-stream-btn");
  if (autoStreamInterval) {
    clearInterval(autoStreamInterval);
    autoStreamInterval = null;
    btn.innerHTML = "<span>▶ Auto Generate (5 Steps)</span>";
    return;
  }

  let steps = 0;
  btn.innerHTML = "<span>⏸ Stop Generation</span>";
  autoStreamInterval = setInterval(() => {
    if (steps >= 5) {
      clearInterval(autoStreamInterval);
      autoStreamInterval = null;
      btn.innerHTML = "<span>▶ Auto Generate (5 Steps)</span>";
      return;
    }
    stepNextWord();
    steps++;
  }, 700);
}

function resetSentence() {
  if (autoStreamInterval) {
    clearInterval(autoStreamInterval);
    autoStreamInterval = null;
    document.getElementById("auto-stream-btn").innerHTML = "<span>▶ Auto Generate (5 Steps)</span>";
  }
  state.generatedTokens = [];
  document.getElementById("stream-generated-part").textContent = "";
  recomputeAndRender();
}

// ============================================================================
// Event Listeners & App Lifecycle
// ============================================================================

function setupEventListeners() {
  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => selectPreset(btn.dataset.id));
  });

  // Temperature slider
  const sliderTemp = document.getElementById("slider-temp");
  sliderTemp.addEventListener("input", (e) => {
    state.temperature = parseFloat(e.target.value);
    document.getElementById("val-temp").textContent = state.temperature.toFixed(2);
    recomputeAndRender();
  });

  // Top-K slider
  const sliderTopK = document.getElementById("slider-top-k");
  sliderTopK.addEventListener("input", (e) => {
    state.top_k = parseInt(e.target.value, 10);
    document.getElementById("val-top-k").textContent = state.top_k;
    recomputeAndRender();
  });

  // Top-P slider
  const sliderTopP = document.getElementById("slider-top-p");
  sliderTopP.addEventListener("input", (e) => {
    state.top_p = parseFloat(e.target.value);
    document.getElementById("val-top-p").textContent = state.top_p.toFixed(2);
    recomputeAndRender();
  });

  // Repetition penalty slider
  const sliderRepPen = document.getElementById("slider-rep-pen");
  sliderRepPen.addEventListener("input", (e) => {
    state.repetition_penalty = parseFloat(e.target.value);
    document.getElementById("val-rep-pen").textContent = state.repetition_penalty.toFixed(2);
    recomputeAndRender();
  });

  // Roll dice button
  document.getElementById("roll-dice-btn").addEventListener("click", executeDiceRoll);

  // Stepping actions
  document.getElementById("step-next-btn").addEventListener("click", stepNextWord);
  document.getElementById("auto-stream-btn").addEventListener("click", toggleAutoStream);
  document.getElementById("reset-stream-btn").addEventListener("click", resetSentence);
}

async function initApp() {
  try {
    const res = await fetch("data/presets.json");
    if (res.ok) {
      const presets = await res.json();
      if (Array.isArray(presets) && presets.length > 0) {
        state.presets = presets;
      }
    }
  } catch {
    console.info("Using embedded fallback presets (likely served via file:// protocol).");
  }

  setupEventListeners();
  selectPreset("factual-paris");
  executeDiceRoll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
