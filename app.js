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
      "the": 10.5,
      "suddenly": 8.4,
      "both": 8.0,
      "a": 5.4,
      "they": 4.8,
      "it": 4.1,
      "finally": 3.8,
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

// Rich scenario-specific continuation transitions for multi-token generation
const SCENARIO_CONTINUATIONS = {
  "factual-paris": {
    "Paris": { ",": 8.5, "is": 7.2, "and": 6.2, "the": 5.1, "located": 4.5, "one": 3.8, "widely": 3.2, "a": 2.5 },
    ",": { "which": 9.2, "the": 7.5, "located": 6.1, "known": 5.4, "a": 4.2, "renowned": 3.8, "France's": 3.1 },
    "which": { "is": 11.4, "has": 6.2, "was": 5.1, "attracts": 4.8, "became": 3.9, "remains": 3.2 },
    "is": { "famous": 9.8, "known": 9.5, "the": 7.2, "located": 6.5, "home": 5.9, "considered": 5.2, "widely": 4.5 },
    "famous": { "for": 12.2, "as": 8.1, "throughout": 5.4, "worldwide": 4.8, "to": 3.9, "around": 3.2 },
    "known": { "for": 12.2, "as": 8.5, "worldwide": 5.2, "throughout": 4.8, "across": 3.9 },
    "for": { "its": 11.8, "art": 7.5, "the": 6.8, "culture": 6.2, "fashion": 5.9, "fine": 4.5, "museums": 4.1 },
    "its": { "art": 9.2, "history": 8.8, "culture": 8.5, "iconic": 7.8, "architecture": 7.2, "cuisine": 6.8, "museums": 6.1 },
    "art": { ",": 8.8, "and": 8.2, "throughout": 5.5, "across": 4.8, ".": 4.2 },
    "culture": { ",": 8.8, "and": 8.2, "worldwide": 5.5, "across": 4.8, ".": 4.2 },
    "and": { "its": 8.5, "the": 7.2, "culture": 6.5, "history": 6.0, "fashion": 5.5 },
    "Lyon": { ",": 8.0, "not": 7.5, "is": 6.2, "which": 5.1, "in": 4.5 },
    "London": { ",": 8.0, "not": 7.5, "is": 6.2, "which": 5.1, "in": 4.5 },
    "Marseille": { ",": 8.0, "not": 7.5, "is": 6.2, "which": 5.1, "in": 4.5 }
  },

  "creative-forest": {
    "glowing": { "crystal": 9.2, "orb": 8.9, "portal": 8.5, "sword": 7.8, "grimoire": 7.4, "amulet": 7.0, "cavern": 6.5, "creature": 6.2, "tome": 5.9, "shrine": 5.4 },
    "mysterious": { "portal": 9.1, "crystal": 8.8, "grimoire": 8.2, "artifact": 7.9, "cavern": 7.4, "creature": 7.0, "door": 6.5, "shrine": 6.1 },
    "hidden": { "cavern": 9.2, "portal": 8.8, "sanctuary": 8.1, "chamber": 7.6, "crystal": 7.2, "passage": 6.8, "shrine": 6.4 },
    "secret": { "chamber": 9.0, "portal": 8.6, "passage": 8.2, "cavern": 7.5, "grimoire": 7.1, "door": 6.8 },
    "crystal": { "pulsing": 8.8, "that": 8.4, "which": 7.9, "resting": 7.2, "emitting": 6.8, "covered": 6.2, "embedded": 5.8 },
    "orb": { "pulsing": 8.8, "hovering": 8.5, "that": 8.1, "floating": 7.6, "emitting": 7.1, "glowing": 6.5 },
    "portal": { "pulsing": 8.9, "leading": 8.5, "swirling": 8.0, "that": 7.6, "shimmering": 7.1, "into": 6.5 },
    "sword": { "embedded": 8.9, "resting": 8.4, "radiating": 7.9, "pulsing": 7.4, "carved": 6.8 },
    "book": { "bound": 8.8, "whispering": 8.2, "covered": 7.8, "resting": 7.2, "radiating": 6.8 },
    "grimoire": { "bound": 8.9, "inscribed": 8.4, "pulsing": 7.9, "resting": 7.3, "whispering": 6.8 },
    "amulet": { "pulsing": 8.8, "carved": 8.2, "glowing": 7.8, "resting": 7.1 },
    "cavern": { "filled": 8.9, "glowing": 8.4, "echoing": 7.9, "carved": 7.2 },
    "door": { "carved": 8.8, "leading": 8.4, "covered": 7.9, "sealed": 7.2 },
    "cave": { "filled": 8.9, "glowing": 8.4, "hidden": 7.8, "carved": 7.1 },
    "dragon": { "sleeping": 9.2, "resting": 8.6, "curled": 8.1, "guarding": 7.5 },
    "pulsing": { "with": 11.5, "in": 7.8, "brightly": 6.8, "rhythmically": 6.1 },
    "emitting": { "a": 9.5, "an": 8.8, "soft": 8.1, "ethereal": 7.5, "bright": 6.8 },
    "hovering": { "above": 9.5, "in": 8.8, "silently": 8.1, "between": 7.2 },
    "floating": { "in": 9.2, "above": 8.8, "gently": 8.1, "near": 7.4 },
    "swirling": { "with": 11.2, "in": 8.1, "slowly": 7.5, "around": 6.8 },
    "that": { "glowed": 9.5, "radiated": 8.8, "whispered": 8.1, "contained": 7.5, "held": 6.9, "hummed": 6.2 },
    "which": { "glowed": 9.4, "radiated": 8.8, "held": 8.0, "whispered": 7.4, "pulsed": 6.8 },
    "with": { "ethereal": 8.9, "ancient": 8.5, "celestial": 8.1, "radiant": 7.5, "dark": 7.0, "mystic": 6.5, "golden": 6.1 },
    "ethereal": { "light": 10.5, "energy": 10.1, "magic": 9.4, "power": 8.8, "whispers": 7.5, "flames": 6.8 },
    "ancient": { "magic": 10.2, "power": 9.8, "runes": 9.1, "energy": 8.5, "light": 7.8 },
    "celestial": { "light": 10.5, "energy": 10.0, "power": 9.2, "flames": 8.1 },
    "radiant": { "light": 10.5, "energy": 9.8, "warmth": 8.5, "power": 7.9 },
    "light": { "illuminating": 9.2, "across": 8.5, "deep": 7.8, "into": 7.1, "and": 6.5, ".": 5.8 },
    "energy": { "coursing": 9.2, "pulsing": 8.5, "through": 7.8, "and": 6.5, ".": 5.8 },
    "magic": { "pulsing": 9.1, "from": 8.5, "into": 7.8, "and": 6.5, ".": 5.8 }
  },

  "repetition-loop": {
    "the": { "dog": 10.8, "cat": 8.2, "animals": 5.5, "two": 5.0, "chase": 4.2, "owner": 3.8, "rain": 2.5 },
    "dog": { "chased": 11.2, "barked": 6.5, "stopped": 5.8, "ran": 5.2, "tripped": 4.8, "collapsed": 3.5 },
    "chased": { "the": 11.5, "a": 5.8, "after": 4.5, "into": 4.1, "around": 3.8 },
    "cat": { "and": 9.5, "ran": 6.8, "climbed": 6.2, "escaped": 5.8, "stopped": 5.0, "hissed": 4.5 },
    "and": { "then": 10.5, "suddenly": 6.2, "the": 5.8, "both": 5.0, "soon": 4.2 },
    "then": { "the": 11.2, "both": 6.5, "they": 5.8, "suddenly": 5.2, "a": 4.5 },
    "suddenly": { "both": 9.2, "they": 8.5, "a": 7.8, "the": 6.5, "everything": 6.0 },
    "both": { "animals": 9.5, "stopped": 9.0, "collapsed": 8.2, "fell": 7.1, "froze": 6.5 },
    "they": { "both": 9.1, "stopped": 8.5, "heard": 7.8, "saw": 7.2, "ran": 6.5 },
    "stopped": { "and": 9.5, "panting": 8.8, "to": 8.2, "exhausted": 7.5, "looking": 6.8 },
    "animals": { "stopped": 9.5, "looked": 8.2, "panted": 7.5, "rested": 6.8 },
    "collapsed": { "onto": 9.2, "on": 8.5, "exhausted": 8.1, "together": 7.2 },
    "panting": { "in": 8.8, "heavily": 8.2, "on": 7.8, "and": 7.1 }
  },

  "code-binary-search": {
    " (low + high) // 2": { "\n        if": 12.5, "\n        guess =": 8.2, "\n        val =": 7.5, "\n        mid_val =": 6.8, "\n        print(mid)": 1.5 },
    " low + (high - low) // 2": { "\n        if": 12.5, "\n        guess =": 8.2, "\n        val =": 7.5, "\n        mid_val =": 6.8 },
    " (low + high) / 2": { "\n        if": 12.0, "\n        val =": 7.5 },
    "\n        if": { " arr[mid] ==": 12.2, " arr[mid] <": 8.5, " arr[mid] >": 7.8, " target ==": 6.2 },
    " arr[mid] ==": { " target:": 13.5, " target": 6.5, " 0:": 2.2 },
    " target:": { "\n            return": 14.1, "\n            print('found')": 3.2, "\n            pass": 1.5 },
    "\n            return": { " mid": 13.8, " True": 8.2, " arr[mid]": 6.5, " 0": 2.5 },
    " mid": { "\n        elif": 12.8, "\n        if": 8.5, "\n        else:": 6.2, "\n        low =": 5.1 },
    "\n        elif": { " arr[mid] <": 12.2, " arr[mid] >": 9.5, " target <": 6.8 },
    " arr[mid] <": { " target:": 13.2, " val:": 4.5 },
    "\n            low =": { " mid + 1": 14.0, " mid": 4.5, " 0": 2.1 },
    " mid + 1": { "\n        else:": 13.2, "\n        elif": 6.5 },
    "\n        else:": { "\n            high =": 13.8, "\n            return": 4.2 },
    "\n            high =": { " mid - 1": 14.2, " mid": 4.5 }
  },

  "bimodal-baseball": {
    "bat": { "at": 9.8, "hard": 8.5, "with": 8.0, "and": 7.2, ",": 6.5, "wildly": 6.0, "toward": 5.2 },
    "wooden": { "bat": 13.2, "stick": 4.5, "club": 3.8 },
    "arms": { "wildly": 9.5, "with": 8.2, "in": 7.5, "around": 6.8, "powerfully": 6.0 },
    "at": { "the": 12.2, "a": 7.5, "an": 5.5, "that": 4.8 },
    "the": { "ball": 13.5, "pitch": 9.8, "fastball": 8.5, "slider": 7.2, "curveball": 6.8 },
    "ball": { ",": 9.8, "and": 8.6, "sending": 8.2, "hitting": 7.5, "driving": 6.8, "missing": 6.2 },
    "pitch": { ",": 9.8, "and": 8.5, "sending": 8.0, "missing": 6.8 },
    "fastball": { ",": 9.8, "and": 8.5, "sending": 8.0, "missing": 6.8 },
    "sending": { "it": 11.8, "the ball": 8.5, "a drive": 7.2 },
    "it": { "deep": 10.5, "flying": 9.2, "into": 8.5, "over": 8.0, "soaring": 7.2 },
    "deep": { "into": 9.8, "the": 8.5, "left": 7.8, "center": 7.2, "field": 6.5 },
    "into": { "the": 11.2, "left": 7.8, "center": 7.2, "the stands": 6.1 },
    "left": { "field": 13.2, "field stands": 7.5, "stands": 6.8 },
    "center": { "field": 13.2, "field stands": 7.5 },
    "field": { ".": 10.5, "for": 8.5, "and": 7.2, "as": 6.5 }
  }
};

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

// Contextual Continuation Resolver supporting presets and custom user prompts
function getContinuationLogits(presetId, generatedTokens, defaultCandidates) {
  const presetObj = state.presets.find(p => p.id === presetId);
  const promptInput = document.getElementById("prompt-input");
  const currentVal = promptInput ? promptInput.value.trim() : state.currentPrompt.trim();

  // If at initial preset prompt and no tokens generated yet, return the calibrated initial candidates
  if ((!generatedTokens || generatedTokens.length === 0) && presetObj && currentVal === presetObj.prompt.trim()) {
    return presetObj.candidates || defaultCandidates;
  }

  const fullText = promptInput
    ? promptInput.value.trim()
    : (state.currentPrompt + " " + (generatedTokens || []).join(" ")).trim();
  const allTokens = fullText.split(/\s+/).filter(Boolean);

  if (allTokens.length === 0) {
    return defaultCandidates;
  }

  // Look in active preset's continuation library
  const scenario = (presetObj && presetObj.continuations && Object.keys(presetObj.continuations).length > 0)
    ? presetObj.continuations
    : (SCENARIO_CONTINUATIONS[presetId] || {});

  // If we have generatedTokens, check last generated token first within the scenario
  if (generatedTokens && generatedTokens.length > 0) {
    const lastGen = generatedTokens[generatedTokens.length - 1];
    const cleanLastGen = lastGen.trim().replace(/^[^a-zA-Z0-9_\n]+|[^a-zA-Z0-9_\n]+$/g, "");
    if (scenario[lastGen]) return scenario[lastGen];
    if (cleanLastGen && scenario[cleanLastGen]) return scenario[cleanLastGen];

    if (generatedTokens.length >= 2) {
      const prevGen = generatedTokens[generatedTokens.length - 2].trim().replace(/^[^a-zA-Z0-9_\n]+|[^a-zA-Z0-9_\n]+$/g, "");
      const twoTokGen = `${prevGen} ${cleanLastGen}`;
      if (scenario[twoTokGen]) return scenario[twoTokGen];
    }
  }

  const lastToken = allTokens[allTokens.length - 1];
  const cleanLast = lastToken.trim().replace(/^[^a-zA-Z0-9_\n]+|[^a-zA-Z0-9_\n]+$/g, "");

  // 1. Direct match on last token in active scenario
  if (scenario[lastToken]) return scenario[lastToken];
  if (cleanLast && scenario[cleanLast]) return scenario[cleanLast];

  // 2. Multi-token context match in active scenario (e.g., "chased the", "bat at", "arr[mid] ==")
  if (allTokens.length >= 2) {
    const prev = allTokens[allTokens.length - 2].trim().replace(/^[^a-zA-Z0-9_\n]+|[^a-zA-Z0-9_\n]+$/g, "");
    const twoTok = `${prev} ${cleanLast}`;
    if (scenario[twoTok]) return scenario[twoTok];
  }

  // 3. Check across all scenario libraries
  for (const scen of Object.values(SCENARIO_CONTINUATIONS)) {
    if (scen[lastToken]) return scen[lastToken];
    if (cleanLast && scen[cleanLast]) return scen[cleanLast];
  }

  // 4. Heuristic part-of-speech & semantics continuation generator for custom prompts
  const lower = cleanLast.toLowerCase();
  if (["is", "was", "are", "were", "has", "had", "been", "become"].includes(lower)) {
    return { "a": 9.2, "the": 8.8, "known": 8.5, "not": 7.8, "one": 7.2, "located": 6.8, "famous": 6.5, "very": 6.0 };
  }
  if (["the", "a", "an", "this", "that", "these", "those", "my", "his", "her", "their", "our"].includes(lower)) {
    return { "first": 8.8, "most": 8.5, "new": 8.2, "world": 7.8, "city": 7.5, "system": 7.1, "model": 6.8, "great": 6.5 };
  }
  if (["in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after"].includes(lower)) {
    return { "the": 10.5, "a": 9.2, "its": 8.5, "this": 7.8, "all": 7.2, "their": 6.8, "every": 6.2 };
  }
  if (["and", "or", "but", "while", "because", "although", "since", "if", "when", "where"].includes(lower)) {
    return { "the": 9.5, "then": 8.8, "it": 8.2, "they": 7.8, "he": 7.2, "we": 6.8, "suddenly": 6.2 };
  }
  if (lastToken.endsWith(".") || lastToken.endsWith("!") || lastToken.endsWith("?")) {
    return { "The": 9.8, "It": 8.8, "This": 8.5, "However,": 7.5, "Then": 7.2, "In": 6.8 };
  }
  if (lastToken.endsWith(",")) {
    return { "which": 9.5, "and": 8.8, "where": 8.2, "the": 7.8, "but": 7.2, "as": 6.8 };
  }
  if (lastToken.endsWith(":")) {
    return { "\n        return": 12.5, "\n        if": 11.2, "\n        pass": 8.5, "\n        print": 7.2 };
  }

  // 5. Intelligent default continuation
  return {
    "and": 7.8,
    "the": 7.5,
    "with": 6.8,
    "in": 6.2,
    "which": 5.8,
    "that": 5.4,
    "suddenly": 5.0,
    ".": 4.5
  };
}

// Tokenize prompt and generated text into subwords and tokens
function tokenizeContext(prompt, generatedTokens) {
  const fullText = prompt + " " + (generatedTokens || []).join(" ");
  const rawWords = fullText.split(/\s+/).filter(Boolean);
  const tokens = [];
  for (const w of rawWords) {
    tokens.push(w);
    const subwords = w.match(/\w+|[^\s\w]/g);
    if (subwords && subwords.length > 1) {
      tokens.push(...subwords);
    }
  }
  return tokens;
}

// ============================================================================
// Core Sampling Math (Client-Side)
// ============================================================================

function applyRepetitionPenalty(logits, contextTokens, penalty) {
  if (penalty <= 1.0 || !contextTokens || contextTokens.length === 0) {
    return { ...logits };
  }

  const counts = {};
  for (const tok of contextTokens) {
    if (!tok) continue;
    const clean = tok.trim().toLowerCase();
    if (clean) {
      counts[clean] = (counts[clean] || 0) + 1;
    }
  }

  const penalized = {};
  for (const [tok, val] of Object.entries(logits)) {
    const cleanTok = tok.trim().toLowerCase();
    const count = counts[cleanTok] || 0;
    if (count > 0) {
      // Frequency-dampened repetition penalty
      const effectivePenalty = Math.pow(penalty, Math.min(2.0, count));
      penalized[tok] = val > 0 ? (val / effectivePenalty) : (val * effectivePenalty);
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

function processDistribution(prompt, rawLogits, params, contextTokens = null) {
  const tokensForPenalty = contextTokens || tokenizeContext(prompt, []);

  // 1. Repetition penalty
  const penalizedLogits = applyRepetitionPenalty(rawLogits, tokensForPenalty, params.repetition_penalty);

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
  const roll = (forcedRoll !== null) ? forcedRoll : Math.random();

  if (surviving.length === 0) {
    const fallbackTok = candidates[0] ? candidates[0].token : "";
    return { token: fallbackTok, roll };
  }

  let cumulative = 0.0;
  for (const c of surviving) {
    cumulative += c.final_prob;
    if (roll <= cumulative) {
      return { token: c.token, roll };
    }
  }

  return { token: surviving[surviving.length - 1].token, roll };
}

// Compute dynamic Beam Search multi-token sequence hypothesis
function computeBeamHypothesis(presetId, generatedTokens, argmaxToken) {
  const sequence = [argmaxToken];
  let curTokens = [...generatedTokens, argmaxToken];

  for (let step = 0; step < 2; step++) {
    const nextLogits = getContinuationLogits(presetId, curTokens, {});
    const sorted = Object.entries(nextLogits).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) break;
    const nextTop = sorted[0][0];
    sequence.push(nextTop);
    curTokens.push(nextTop);
  }

  return sequence.join(" ");
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

    item.innerHTML = `
      <div class="bar-token-label">
        <span class="token-rank-num">#${idx + 1}</span>
        <strong>'${escapeHtml(c.token)}'</strong>
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

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    "#ec4899", "#f59e0b", "#3b82f6", "#14b8a6",
    "#f43f5e", "#84cc16", "#eab308", "#0ea5e9"
  ];

  surviving.forEach((c, idx) => {
    const slice = document.createElement("div");
    slice.className = "tape-slice";
    slice.style.width = `${c.final_prob * 100}%`;
    slice.style.backgroundColor = colors[idx % colors.length];
    slice.title = `'${c.token}': ${(c.final_prob * 100).toFixed(1)}%`;
    slice.textContent = (c.final_prob > 0.05) ? `'${c.token}'` : "·";
    tape.appendChild(slice);
  });

  const pointer = document.getElementById("tape-pointer");
  if (activeRoll !== null) {
    const percent = Math.min(99.5, Math.max(0.5, activeRoll * 100));
    pointer.style.left = `${percent}%`;
    document.getElementById("pointer-tag").textContent = `r = ${activeRoll.toFixed(3)}`;
    document.getElementById("roll-coord-display").textContent = activeRoll.toFixed(4);
    if (activeWinner !== null) {
      document.getElementById("roll-winner-display").textContent = `'${activeWinner}'`;
    }
  } else {
    // Default pointer position at start or after reset: point to top candidate slice center
    const topP = surviving.length > 0 ? Math.min(50, surviving[0].final_prob * 50) : 50;
    pointer.style.left = `${topP}%`;
    document.getElementById("pointer-tag").textContent = `r = 0.000`;
    document.getElementById("roll-coord-display").textContent = "Ready";
    document.getElementById("roll-winner-display").textContent = surviving[0] ? `'${surviving[0].token}'` : "—";
  }
}

function updateStrategiesDisplay() {
  const result = state.distributionResult;
  document.getElementById("strat-greedy-tok").textContent = `'${result.argmax_token}'`;

  // Simulate Nucleus roll from active candidates
  const sampleRes = sampleFromCandidates(result.candidates);
  document.getElementById("strat-nucleus-tok").textContent = `'${sampleRes.token}'`;

  // Beam Search hypothesis dynamically projected
  const beamHypothesis = computeBeamHypothesis(state.activePresetId, state.generatedTokens, result.argmax_token);
  document.getElementById("strat-beam-tok").textContent = `'${beamHypothesis}'`;
}

function renderPresetInsights(preset) {
  if (!preset) return;
  document.getElementById("scenario-title").textContent = preset.title;
  document.getElementById("scenario-explanation").textContent = preset.explanation;
}

function updateTokenCountDisplay() {
  const countEl = document.getElementById("prompt-token-count");
  if (!countEl) return;
  const promptInput = document.getElementById("prompt-input");
  const text = promptInput ? promptInput.value : state.currentPrompt;
  const tokens = tokenizeContext(text, []);
  countEl.textContent = `${tokens.length} token${tokens.length === 1 ? "" : "s"}`;
}

function updatePromptUI(text) {
  const promptInput = document.getElementById("prompt-input");
  if (promptInput) {
    promptInput.value = text;
  }
  const promptDisplay = document.getElementById("prompt-display");
  if (promptDisplay) {
    promptDisplay.textContent = text;
  }
  const streamPrompt = document.getElementById("stream-prompt-part");
  if (streamPrompt) {
    streamPrompt.textContent = text;
  }
  updateTokenCountDisplay();
}

function updateGeneratedTextDisplay() {
  const streamEl = document.getElementById("stream-generated-part");
  if (!streamEl) return;

  let formatted = "";
  for (let i = 0; i < state.generatedTokens.length; i++) {
    const tok = state.generatedTokens[i];
    if (tok.startsWith("\n") || tok.startsWith(" ")) {
      formatted += tok;
    } else if (tok === "," || tok === "." || tok === "!" || tok === "?" || tok === ":") {
      formatted += tok;
    } else {
      formatted += (i === 0 ? " " : " ") + tok;
    }
  }
  streamEl.textContent = formatted;
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

  updatePromptUI(preset.prompt);
  updateGeneratedTextDisplay();

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === presetId);
  });

  recomputeAndRender();
  renderPresetInsights(preset);
}

function recomputeAndRender(lastRoll = null, lastToken = null) {
  const preset = state.presets.find(p => p.id === state.activePresetId) || state.presets[0];

  // Dynamically resolve continuation logits conditioned on generated sequence history
  const activeLogits = getContinuationLogits(state.activePresetId, state.generatedTokens, preset.candidates);

  const promptInput = document.getElementById("prompt-input");
  const activeText = promptInput ? promptInput.value : (state.currentPrompt + " " + state.generatedTokens.join(" "));
  const fullTokens = tokenizeContext(activeText, []);

  state.distributionResult = processDistribution(
    activeText,
    activeLogits,
    {
      temperature: state.temperature,
      top_k: state.top_k,
      top_p: state.top_p,
      min_p: state.min_p,
      repetition_penalty: state.repetition_penalty
    },
    fullTokens
  );

  renderDistributionBars();

  // Set default inspector to argmax candidate
  if (state.distributionResult.candidates.length > 0) {
    updateMathInspector(state.distributionResult.candidates[0]);
  }

  // Render probability tape and strategies for the new step
  renderProbabilityTape(lastRoll, lastToken);
  updateStrategiesDisplay();
  updateTokenCountDisplay();
}

function executeDiceRoll() {
  const res = sampleFromCandidates(state.distributionResult.candidates);
  renderProbabilityTape(res.roll, res.token);
}

function stepNextWord() {
  // 1. Sample token from current candidate distribution
  const res = sampleFromCandidates(state.distributionResult.candidates);

  // 2. Append newly sampled token to context history
  state.generatedTokens.push(res.token);

  // 3. Append to top prompt textarea with smart spacing
  const promptInput = document.getElementById("prompt-input");
  if (promptInput) {
    let val = promptInput.value;
    const tok = res.token;
    if (tok.startsWith("\n") || tok.startsWith(" ")) {
      val += tok;
    } else if (tok === "," || tok === "." || tok === "!" || tok === "?" || tok === ":") {
      val += tok;
    } else {
      val += (val.length === 0 || val.endsWith(" ") || val.endsWith("\n") ? "" : " ") + tok;
    }
    promptInput.value = val;
    promptInput.scrollTop = promptInput.scrollHeight;
  }

  // 4. Update bottom stream display
  updateGeneratedTextDisplay();

  // 5. Dynamically recalculate candidate probabilities for the next token!
  recomputeAndRender(res.roll, res.token);
}

let autoStreamInterval = null;
function toggleAutoStream() {
  const topBtn = document.getElementById("top-auto-btn");
  const bottomBtn = document.getElementById("auto-stream-btn");

  if (autoStreamInterval) {
    clearInterval(autoStreamInterval);
    autoStreamInterval = null;
    const label = "<span>▶ Auto Generate (5 Steps)</span>";
    if (topBtn) topBtn.innerHTML = label;
    if (bottomBtn) bottomBtn.innerHTML = label;
    return;
  }

  let steps = 0;
  const runningLabel = "<span>⏸ Stop Generation</span>";
  if (topBtn) topBtn.innerHTML = runningLabel;
  if (bottomBtn) bottomBtn.innerHTML = runningLabel;

  autoStreamInterval = setInterval(() => {
    if (steps >= 5) {
      clearInterval(autoStreamInterval);
      autoStreamInterval = null;
      const label = "<span>▶ Auto Generate (5 Steps)</span>";
      if (topBtn) topBtn.innerHTML = label;
      if (bottomBtn) bottomBtn.innerHTML = label;
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
    const label = "<span>▶ Auto Generate (5 Steps)</span>";
    const topBtn = document.getElementById("top-auto-btn");
    const bottomBtn = document.getElementById("auto-stream-btn");
    if (topBtn) topBtn.innerHTML = label;
    if (bottomBtn) bottomBtn.innerHTML = label;
  }
  const preset = state.presets.find(p => p.id === state.activePresetId) || state.presets[0];
  state.currentPrompt = preset.prompt;
  state.generatedTokens = [];
  updatePromptUI(preset.prompt);
  updateGeneratedTextDisplay();
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

  // Top prompt input editing & keyboard shortcuts
  const promptInput = document.getElementById("prompt-input");
  if (promptInput) {
    let inputDebounce = null;
    promptInput.addEventListener("input", (e) => {
      clearTimeout(inputDebounce);
      inputDebounce = setTimeout(() => {
        const text = e.target.value;
        state.currentPrompt = text;
        state.generatedTokens = [];

        // Check if prefix corresponds to an existing preset
        const matched = state.presets.find(p => text.startsWith(p.prompt.trim()));
        if (matched) {
          state.activePresetId = matched.id;
          const extra = text.slice(matched.prompt.trim().length).trim();
          if (extra) {
            state.generatedTokens = extra.split(/\s+/).filter(Boolean);
          }
        }

        updateTokenCountDisplay();
        const streamPrompt = document.getElementById("stream-prompt-part");
        if (streamPrompt) streamPrompt.textContent = text;
        updateGeneratedTextDisplay();
        recomputeAndRender();
      }, 100);
    });

    promptInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        stepNextWord();
      }
    });
  }

  // Top action buttons
  const topSampleBtn = document.getElementById("top-sample-btn");
  if (topSampleBtn) topSampleBtn.addEventListener("click", stepNextWord);

  const topAutoBtn = document.getElementById("top-auto-btn");
  if (topAutoBtn) topAutoBtn.addEventListener("click", toggleAutoStream);

  const topRollBtn = document.getElementById("top-roll-btn");
  if (topRollBtn) topRollBtn.addEventListener("click", executeDiceRoll);

  const resetPromptBtn = document.getElementById("reset-prompt-btn");
  if (resetPromptBtn) resetPromptBtn.addEventListener("click", resetSentence);

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
