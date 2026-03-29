# Loan Approval Simulator - Technical Documentation

This document provides a detailed overview of the inner workings of the Fuzzy-ID3 Loan Approval Simulator. It explains the data pipeline, the variables involved, the mathematical calculations for the decision tree, and the fuzzy logic implementation.

---

## 1. System Pipeline

The application follows a standard Fuzzy Expert System pipeline combined with a Decision Tree classifier:

1. **Training Phase (ID3)**: The system reads historical loan application data (`trainingData`) and builds a decision tree using the ID3 algorithm. It calculates Entropy and Information Gain to determine the best attributes to split the data.
2. **Input Phase**: The user provides crisp (exact) numerical inputs for various financial metrics (e.g., Income = $65,000).
3. **Fuzzification**: The crisp inputs are passed through Membership Functions to convert them into Fuzzy Sets (e.g., Income is 30% "Medium" and 70% "High").
4. **Inference (Path Traversal)**: The fuzzy sets are fed into the decision tree. Instead of taking a single definitive path, the simulation traverses *all* possible paths where the fuzzy membership is greater than 0. The probability of taking a branch is determined by the membership degree.
5. **Defuzzification (Aggregation)**: The system reaches multiple leaf nodes (outcomes). It calculates the overall likelihood of "Approved" vs "Rejected" by taking a weighted sum of the probabilities from all reached leaves.
6. **Visualization**: The UI renders the tree, animates the traversal, and highlights the specific paths taken.

---

## 2. Variables and Linguistic Terms

The system evaluates loan applications based on 5 primary input variables. Each variable is mapped to linguistic terms using fuzzy sets.

*   **Income ($)**: `Low`, `Medium`, `High`
*   **Credit Score**: `Poor`, `Fair`, `Good`, `Excellent`
*   **Debt-to-Income (DTI) (%)**: `Low`, `Medium`, `High`
*   **Loan Amount ($)**: `Small`, `Medium`, `Large`
*   **Employment History (Years)**: `Short`, `Medium`, `Long`

**Target Variable**:
*   **Decision**: `Approved`, `Rejected`

---

## 3. Fuzzy Logic Implementation

### Membership Functions
To convert crisp numbers into fuzzy linguistic terms, we use geometric membership functions defined in `src/fuzzy/fuzzy.ts`. They return a value between `0.0` (no membership) and `1.0` (full membership).

1.  **Triangle (`triangle`)**: Used for values that peak at a specific point.
    *   Defined by `[a, b, c]` where `a` is the start (0), `b` is the peak (1), and `c` is the end (0).
2.  **Trapezoid (`trapezoid`)**: Used for values that have a flat peak (a range of full membership).
    *   Defined by `[a, b, c, d]` where it rises from `a` to `b`, stays at 1 from `b` to `c`, and falls from `c` to `d`.
3.  **Left Shoulder (`leftShoulder`)**: Used for "Low" or "Poor" categories. It stays at 1.0 for all values below a certain point, then slopes down to 0.
    *   Defined by `[a, b]`. 1.0 for `x <= a`, slopes to 0 at `b`.
4.  **Right Shoulder (`rightShoulder`)**: Used for "High" or "Excellent" categories. It slopes up from 0 to 1.0, then stays at 1.0 for all higher values.
    *   Defined by `[a, b]`. 0 at `a`, slopes to 1.0 at `b`, stays 1.0 for `x >= b`.

### Fuzzification
When a user inputs an Income of `$55,000`, the `fuzzifyIncome` function evaluates this crisp number against the `Low`, `Medium`, and `High` membership functions.
*   *Example Result*: `{ Low: 0.0, Medium: 0.75, High: 0.25 }`

### Defuzzification (Aggregation)
Because inputs are fuzzy, a single application might end up partially in an "Approved" leaf and partially in a "Rejected" leaf.
*   **Path Probability**: The probability of reaching a specific leaf is the product of the fuzzy memberships along that path.
*   **Final Likelihood**: The system sums up the probabilities of all paths leading to an "Approved" outcome and compares it to the sum of paths leading to a "Rejected" outcome to give a final percentage (e.g., 85% Approved, 15% Rejected).

---

## 4. Decision Tree Calculations (ID3)

The tree is built dynamically in `src/core/id3.ts` using the ID3 algorithm, which relies on Shannon Entropy.

### Entropy
Entropy measures the impurity or uncertainty of a dataset. A dataset with 100% "Approved" has an entropy of 0. A dataset with 50% "Approved" and 50% "Rejected" has an entropy of 1.
*   **Formula**: `H(S) = - Σ (p_i * log2(p_i))`
    *   Where `p_i` is the proportion of class `i` in the set `S`.

### Information Gain (IG)
Information Gain measures how much the Entropy is reduced when we split the dataset using a specific attribute (e.g., splitting by Credit Score).
*   **Formula**: `IG(S, A) = H(S) - Σ ((|S_v| / |S|) * H(S_v))`
    *   Where `S` is the current dataset, `A` is the attribute, `S_v` is the subset of `S` where attribute `A` has value `v`.
*   **Selection**: At each node, the algorithm calculates the IG for all available attributes and chooses the one with the highest IG to be the decision node.

---

## 5. Path Traversal Mechanism

The visual simulation and the mathematical evaluation both traverse the tree using a Depth-First Search (DFS) approach.

1.  **Starting at the Root**: The traversal begins at the root node with a path probability of `1.0`.
2.  **Evaluating Nodes**: At each decision node (e.g., "Credit Score"), the system looks at the fuzzified input for that attribute (e.g., `{ Poor: 0, Fair: 0.2, Good: 0.8, Excellent: 0 }`).
3.  **Branching**: The traversal splits. It travels down the "Fair" branch with a probability multiplier of `0.2`, and down the "Good" branch with a multiplier of `0.8`. Branches with `0` membership are ignored.
4.  **Fallback Logic (Unknowns)**: If the user provides an input that results in a fuzzy state not seen in the training data (e.g., the tree only knows "Poor" and "Good", but the input is 100% "Fair"), the system uses historical `branchWeights`. It distributes the probability down the existing branches based on how often those branches occurred in the training data, ensuring the simulation never gets stuck.
5.  **Reaching Leaves**: When a leaf node is reached, the accumulated path probability is recorded alongside the leaf's classification ("Approved" or "Rejected").

This multi-path traversal perfectly visualizes how fuzzy logic handles uncertainty, allowing an application to exist in multiple states simultaneously until the final defuzzification step aggregates the results.
