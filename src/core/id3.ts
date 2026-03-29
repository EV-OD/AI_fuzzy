export type DataRow = Record<string, string | null>;

export interface TreeNode {
  attribute?: string;
  children?: Record<string, TreeNode>;
  branchWeights?: Record<string, number>;
  isLeaf?: boolean;
  probabilities?: Record<string, number>;
  samples?: number;
  id: string; // For visualization
}

export function calculateEntropy(data: DataRow[], targetAttr: string): number {
  if (data.length === 0) return 0;
  
  const counts: Record<string, number> = {};
  for (const row of data) {
    const val = row[targetAttr] as string;
    counts[val] = (counts[val] || 0) + 1;
  }

  let entropy = 0;
  for (const key in counts) {
    const p = counts[key] / data.length;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function calculateInformationGain(data: DataRow[], attr: string, targetAttr: string): number {
  const totalEntropy = calculateEntropy(data, targetAttr);
  
  const subsets: Record<string, DataRow[]> = {};
  for (const row of data) {
    const val = row[attr] as string;
    if (!subsets[val]) subsets[val] = [];
    subsets[val].push(row);
  }

  let subsetEntropy = 0;
  for (const key in subsets) {
    const subset = subsets[key];
    const p = subset.length / data.length;
    subsetEntropy += p * calculateEntropy(subset, targetAttr);
  }

  return totalEntropy - subsetEntropy;
}

let nodeIdCounter = 0;

export function buildDecisionTree(data: DataRow[], attributes: string[], targetAttr: string, depth = 0): TreeNode {
  const id = `node_${nodeIdCounter++}`;
  
  // Base cases
  const targetValues = data.map(row => row[targetAttr] as string);
  const uniqueTargets = Array.from(new Set(targetValues));
  
  const probabilities: Record<string, number> = {};
  for (const val of targetValues) {
    probabilities[val] = (probabilities[val] || 0) + 1;
  }
  for (const key in probabilities) {
    probabilities[key] /= data.length;
  }

  if (uniqueTargets.length === 1 || attributes.length === 0 || depth > 5) { // Limit depth to prevent massive trees
    return {
      isLeaf: true,
      probabilities,
      samples: data.length,
      id
    };
  }

  // Find best attribute
  let bestAttr = attributes[0];
  let maxGain = -1;

  for (const attr of attributes) {
    const gain = calculateInformationGain(data, attr, targetAttr);
    if (gain > maxGain) {
      maxGain = gain;
      bestAttr = attr;
    }
  }

  // If no gain, make it a leaf
  if (maxGain <= 0) {
    return {
      isLeaf: true,
      probabilities,
      samples: data.length,
      id
    };
  }

  // Split data
  const subsets: Record<string, DataRow[]> = {};
  const branchWeights: Record<string, number> = {};
  
  for (const row of data) {
    const val = row[bestAttr] as string;
    if (!subsets[val]) subsets[val] = [];
    subsets[val].push(row);
  }

  for (const key in subsets) {
    branchWeights[key] = subsets[key].length / data.length;
  }

  const remainingAttributes = attributes.filter(a => a !== bestAttr);
  const children: Record<string, TreeNode> = {};

  for (const key in subsets) {
    children[key] = buildDecisionTree(subsets[key], remainingAttributes, targetAttr, depth + 1);
  }

  return {
    attribute: bestAttr,
    children,
    branchWeights,
    samples: data.length,
    id
  };
}

export interface LeafResult {
  path: { attribute: string, value: string }[];
  probability: number;
  decision: string;
  likelihood: number;
  rawProbabilities: Record<string, number>;
  leafNodeId: string;
  pathNodeIds: string[];
}

export function computeLeafResults(tree: TreeNode, fuzzyInputs: Record<string, Record<string, number>>): LeafResult[] {
  const leaves: LeafResult[] = [];
  
  function traverse(node: TreeNode, currentPath: { attribute: string, value: string }[], prob: number, currentPathIds: string[]) {
    const newPathIds = [...currentPathIds, node.id];
    if (node.isLeaf) {
      let decision = "Unknown";
      let maxP = -1;
      for (const [cls, p] of Object.entries(node.probabilities || {})) {
        if (p > maxP) { maxP = p; decision = cls; }
      }
      leaves.push({
        path: currentPath,
        probability: prob,
        decision,
        likelihood: maxP * 100,
        rawProbabilities: node.probabilities || {},
        leafNodeId: node.id,
        pathNodeIds: newPathIds
      });
      return;
    }
    
    const attr = node.attribute;
    const fuzzySet = attr ? fuzzyInputs[attr] : null;
    
    let totalWeight = 0;
    if (fuzzySet && fuzzySet["Unknown"] !== 1) {
      for (const key in node.children || {}) {
        totalWeight += (fuzzySet[key] || 0);
      }
    }
    
    for (const key in node.children || {}) {
      const child = node.children![key];
      let edgeProb = prob;
      
      if (fuzzySet && fuzzySet["Unknown"] !== 1) {
        if (totalWeight > 0) {
          edgeProb *= (fuzzySet[key] || 0);
        } else {
          edgeProb *= (node.branchWeights?.[key] || 0);
        }
      } else if (fuzzySet && fuzzySet["Unknown"] === 1) {
        edgeProb *= (node.branchWeights?.[key] || 0);
      }
      
      if (edgeProb > 0) {
        traverse(child, [...currentPath, { attribute: attr!, value: key }], edgeProb, newPathIds);
      }
    }
  }
  
  if (Object.keys(fuzzyInputs).length > 0) {
    traverse(tree, [], 1, []);
  }
  return leaves.sort((a, b) => b.probability - a.probability);
}

export function traverseFuzzyTree(tree: TreeNode, fuzzyInputs: Record<string, Record<string, number>>): Record<string, number> {
  if (tree.isLeaf) {
    return tree.probabilities || {};
  }

  const attr = tree.attribute!;
  const fuzzySet = fuzzyInputs[attr];

  if (!fuzzySet || fuzzySet["Unknown"] === 1) {
    // Missing value: propagate probabilities weighted by branch weights
    const combinedProbs: Record<string, number> = {};
    for (const branch in tree.children) {
      const weight = tree.branchWeights?.[branch] || 0;
      const childProbs = traverseFuzzyTree(tree.children[branch], fuzzyInputs);
      for (const target in childProbs) {
        combinedProbs[target] = (combinedProbs[target] || 0) + weight * childProbs[target];
      }
    }
    return combinedProbs;
  }

  const combinedProbs: Record<string, number> = {};
  let totalWeight = 0;

  for (const val in fuzzySet) {
    const membership = fuzzySet[val];
    if (membership > 0) {
      const child = tree.children?.[val];
      if (child) {
        totalWeight += membership;
        const childProbs = traverseFuzzyTree(child, fuzzyInputs);
        for (const target in childProbs) {
          combinedProbs[target] = (combinedProbs[target] || 0) + membership * childProbs[target];
        }
      }
    }
  }

  if (totalWeight === 0) {
    // Fallback to uniform distribution if no known branches matched
    for (const branch in tree.children) {
      const weight = tree.branchWeights?.[branch] || 0;
      const childProbs = traverseFuzzyTree(tree.children[branch], fuzzyInputs);
      for (const target in childProbs) {
        combinedProbs[target] = (combinedProbs[target] || 0) + weight * childProbs[target];
      }
    }
  }

  return combinedProbs;
}

