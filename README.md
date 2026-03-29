<div align="center">
  <h1>Fuzzy-Logic Loan Approval System</h1>
  <p>A browser-based Loan Approval Simulator powered by an ID3 Decision Tree and Fuzzy Logic — built with React, TypeScript, and Vite.</p>

  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-GitHub_Pages-222222?logo=github" />
</div>

---

## Overview

This application simulates a bank's loan approval process using two AI techniques working together:

1. **ID3 Decision Tree** — Trained on historical loan data using Shannon Entropy and Information Gain to determine the most discriminating attributes at each node.
2. **Fuzzy Logic** — Instead of hard yes/no decisions, crisp user inputs (e.g. Income = $55,000) are fuzzified into linguistic terms (e.g. 75% "Medium", 25% "High"), allowing the tree to be traversed across *all* plausible paths simultaneously.
3. **Defuzzification** — The weighted probabilities from all reached leaf nodes are aggregated into a final approval likelihood (e.g. 85% Approved / 15% Rejected).

The result is a fully animated, interactive visualization of how uncertainty propagates through a decision tree.

---

## Features

- 🌳 **Dynamic ID3 Tree** — Built at runtime from training data; recalculates on preset change
- 🔀 **Multi-path Fuzzy Traversal** — Animates every branch weighted by membership degree
- 📊 **Information Gain Inspector** — See which attribute was chosen at each node and why
- 🎛️ **Preset Scenarios** — Load predefined applicant profiles to explore different outcomes
- 📱 **Responsive UI** — Sidebar + zoomable tree canvas that works on any screen size

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Package Manager | pnpm |

---

## Run Locally

**Prerequisites:** Node.js 18+ and [pnpm](https://pnpm.io/installation)

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the development server**

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build for Production

```bash
pnpm build
```

The output will be in the `dist/` directory. To preview the production build locally:

```bash
pnpm preview
```

---

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the app to GitHub Pages on every push to `master`.

### Setup Steps

1. **Enable GitHub Pages** in your repository:
   - Go to **Settings → Pages**
   - Under *Source*, select **GitHub Actions**

2. **Push to `master`** — the workflow will trigger automatically and deploy to:

   ```
   https://<your-username>.github.io/<your-repo>/
   ```

### Workflow Summary

```
push to master
    └── build job
          ├── Checkout code
          ├── Setup pnpm
          ├── Install dependencies
          ├── vite build --base=/<repo-name>/
          └── Upload Pages artifact
    └── deploy job
          └── Deploy to GitHub Pages
```

---

## Project Structure

```
src/
├── core/
│   └── id3.ts          # ID3 algorithm — entropy, information gain, tree building
├── fuzzy/
│   └── fuzzy.ts        # Membership functions — triangle, trapezoid, shoulder
├── data/
│   └── presets.ts      # Training dataset and preset applicant profiles
├── ui/
│   ├── ApplicationForm.tsx   # User input form with sliders
│   ├── TreeCanvas.tsx        # Animated SVG tree renderer
│   └── TreeLayout.ts         # Tree node positioning algorithm
├── App.tsx             # Main application state and orchestration
└── main.tsx            # Entry point
```

---

## How It Works

```
User Input (crisp values)
        │
        ▼
  Fuzzification
  (crisp → fuzzy sets via membership functions)
        │
        ▼
  ID3 Decision Tree Traversal
  (multi-path, weighted by membership degrees)
        │
        ▼
  Leaf Node Aggregation
  (weighted sum of Approved / Rejected probabilities)
        │
        ▼
  Final Decision
  (e.g. 85% Approved / 15% Rejected)
```

---

## License

MIT
