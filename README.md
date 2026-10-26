# LLM Next-Token Sampling & Decoding Playground

[![Python 3.13](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages Ready](https://img.shields.io/badge/GitHub_Pages-Ready-brightgreen.svg)](#-how-to-host-on-github-pages)
[![Tests Passing](https://img.shields.io/badge/Tests-14%20Passed-emerald.svg)](#-local-testing--verification)

An interactive, zero-backend, client-side web application designed to be hosted directly on **GitHub Pages**. 
It visually and mathematically unpacks how **Sampling & Decoding Algorithms** turn raw neural network logits into human language, directly inspired by:
- 📄 **[The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)** (Ari Holtzman et al., 2019 - *Inventors of Nucleus Sampling*)
- 🎨 **[How to Generate Text: Using Different Decoding Methods for Language Generation with Transformers](https://huggingface.co/blog/how-to-generate)** (Hugging Face)
- 🔬 **[CTRL: A Conditional Transformer Language Model](https://arxiv.org/abs/1909.05858)** (Nitish Shirish Keskar et al., 2019 - *Repetition Penalty*)

---

## 🌐 Live GitHub Pages Demo
- **Live Interactive Demo:** [https://martianunlimited.github.io/llm_sampling/](https://martianunlimited.github.io/llm_sampling/)
- **Companion Tokenizer Demo:** [https://martianunlimited.github.io/llm_tokenizer/](https://martianunlimited.github.io/llm_tokenizer/)
- **Companion Embeddings Demo:** [https://martianunlimited.github.io/llm_embedding/](https://martianunlimited.github.io/llm_embedding/)
- **Companion Attention Demo:** [https://martianunlimited.github.io/llm_attention/](https://martianunlimited.github.io/llm_attention/)
- **GitHub Repository:** [https://github.com/martianunlimited/llm_sampling](https://github.com/martianunlimited/llm_sampling)

---

## 🧭 Interactive Modules in the Demo

### 1. Scenario & Hyperparameter Studio
* **Factual Recall (Paris):** Low entropy distribution where the ground truth dominates. High temperature causes hallucination.
* **Creative Storytelling (Enchanted Forest):** High entropy distribution with rich diversity. Nucleus sampling clips unviable tails while preserving creative prose.
* **Degenerative Repetition Loop (Chasing Dogs):** Watch greedy search get trapped in an infinite cycle (*"the dog chased the cat and then the cat chased the dog..."*), and watch how raising **Repetition Penalty** breaks the loop!
* **Code Completion (Binary Search):** Near-zero entropy where deterministic formula tokens (`(low + high) // 2`) are required.
* **Bimodal Polysemy (Baseball Batter):** Polysemy collapse to domain tools (*bat* vs *arms* vs *helmet*).

### 2. Candidate Distribution & Filter Horizon
* Live horizontal bar chart of top vocabulary candidates.
* Visual indicators distinguishing **Active Tokens** from **Filtered Tokens** (with specific filter reasons).
* Interactive Scalar Inspector showing:
  $$\text{Logit } (z_i) \quad \xrightarrow{\text{Repetition Penalty}} \quad z_i' \quad \xrightarrow{\div T} \quad \frac{z_i'}{T} \quad \xrightarrow{\text{Softmax}} \quad P(i) \quad \xrightarrow{\text{Filter \& Renorm}} \quad P_{\text{final}}(i)$$

### 3. Continuous Probability Tape & Random Roll
* Continuous cumulative $[0.0, 1.0]$ tape showing how a computer draws a uniform random number $r \in [0.0, 1.0)$ and lands on the selected token.
* Click **🎲 Roll Dice** to watch the pointer animate to the sampled coordinate!

### 4. Decoding Strategies: Greedy vs. Beam vs. Nucleus
* **Greedy Search ($T \to 0$):** $O(1)$ argmax choice. Fast, but risks repetition loops and local minima.
* **Beam Search (Width = 3):** Explores a combinatorial tree of parallel hypotheses, optimizing global path likelihood $\sum \log P(w_t \mid w_{<t})$.
* **Nucleus (Top-$p$) Sampling:** Dynamically expands and contracts the candidate pool based on model confidence.

### 5. Multi-Token Step-by-Step Generator
* Click **⚡ Step Next Word** or **▶ Auto Generate** to watch an autoregressive LLM generate text word by word, updating the probability chart on every step!

---

## 🚀 How to Host on GitHub Pages

This project is 100% static (HTML, CSS, JS) and requires **no build step, no Node server, and no Python backend**:

```bash
# 1. Initialize git and commit
git init
git add .
git commit -m "Initial commit: LLM Next-Token Sampling & Decoding Playground"

# 2. Push to your GitHub repository
git branch -M main
git remote add origin https://github.com/martianunlimited/llm_sampling.git
git push -u origin main

# 3. Enable GitHub Pages in your repo:
# Settings -> Pages -> Source: Deploy from a branch -> Branch: main -> / (root) -> Save!
# Your live site is now ready at: https://martianunlimited.github.io/llm_sampling/
```

---

## 🧪 Local Testing & Verification

### 1. Run Automated Tests
```bash
python -m pytest -q
# 14 passed in 0.18s

python -m ruff check . --fix
python -m ruff format .
```

### 2. Terminal CLI Explorer
```bash
# Inspect available educational presets:
python -m src.cli presets

# Compute candidate distribution and simulate sampling:
python -m src.cli sample --preset factual-paris --temp 0.2 --top-k 5

# Test Beam Search:
python -m src.cli beam-search --width 3
```

### 3. Preview Locally
```bash
python -m http.server 8080
# Open http://localhost:8080 in your browser
```

---

## 📄 License
MIT License. Free for educational, academic, and open-source use.
