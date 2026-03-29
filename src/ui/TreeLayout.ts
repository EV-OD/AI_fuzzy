import { TreeNode } from "../core/id3";

export interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  width: number;
  depth: number;
  children: Record<string, LayoutNode>;
  label?: string; // The branch label that led to this node
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const X_SPACING = 60;
const Y_SPACING = 120;

export function layoutTree(tree: TreeNode): LayoutNode {
  // First pass: calculate widths
  function calculateWidths(node: TreeNode): number {
    if (node.isLeaf || !node.children) {
      return NODE_WIDTH;
    }
    let totalWidth = 0;
    for (const key in node.children) {
      totalWidth += calculateWidths(node.children[key]) + X_SPACING;
    }
    return Math.max(NODE_WIDTH, totalWidth - X_SPACING);
  }

  // Second pass: assign coordinates
  function assignCoordinates(node: TreeNode, x: number, y: number, depth: number, label?: string): LayoutNode {
    const layout: LayoutNode = {
      node,
      x,
      y,
      width: calculateWidths(node),
      depth,
      children: {},
      label
    };

    if (!node.isLeaf && node.children) {
      let currentX = x - layout.width / 2;
      for (const key in node.children) {
        const childWidth = calculateWidths(node.children[key]);
        const childX = currentX + childWidth / 2;
        layout.children[key] = assignCoordinates(node.children[key], childX, y + NODE_HEIGHT + Y_SPACING, depth + 1, key);
        currentX += childWidth + X_SPACING;
      }
    }

    return layout;
  }

  return assignCoordinates(tree, 0, 0, 0);
}
