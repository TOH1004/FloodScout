export type PanelId = 'camera' | 'map' | 'navigation' | 'victims' | 'status' | 'controls' | 'log';

export type LayoutNode =
  | { type: 'panel'; id: PanelId }
  | { type: 'group'; id: string; direction: 'horizontal' | 'vertical'; children: LayoutNode[] };

let groupIdCounter = 0;
export const generateGroupId = () => `group-${Date.now()}-${groupIdCounter++}`;

/** Recursively finds a node by panelId */
export function findNode(node: LayoutNode, id: PanelId): LayoutNode | null {
  if (node.type === 'panel' && node.id === id) return node;
  if (node.type === 'group') {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** Recursively normalizes tree by flattening same-direction nested groups and unwrapping single-child groups */
export function normalizeTree(node: LayoutNode | null): LayoutNode | null {
  if (!node) return null;
  if (node.type === 'panel') return node;
  
  const newChildren: LayoutNode[] = [];
  for (const child of node.children) {
    const normalized = normalizeTree(child);
    if (!normalized) continue;
    if (normalized.type === 'group' && normalized.direction === node.direction) {
      newChildren.push(...normalized.children);
    } else {
      newChildren.push(normalized);
    }
  }
  
  if (newChildren.length === 0) return null;
  if (newChildren.length === 1) return newChildren[0];
  return { ...node, children: newChildren };
}

/** Recursively removes a node and cleans up empty/single-child groups */
export function removeNode(node: LayoutNode | null, id: PanelId): LayoutNode | null {
  if (!node) return null;
  if (node.type === 'panel') {
    return node.id === id ? null : node;
  }
  
  if (node.type === 'group') {
    const newChildren = node.children
      .map(child => removeNode(child, id))
      .filter((child): child is LayoutNode => child !== null);
      
    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return normalizeTree(newChildren[0]);
    
    return normalizeTree({ ...node, children: newChildren });
  }
  return node;
}

/** 
 * Inserts a new panel relative to a target panel.
 * If dropping inside a group of the same direction, it adds to the children.
 * Otherwise, it wraps the target in a new group.
 */
export function insertNode(
  root: LayoutNode | null,
  targetId: PanelId,
  newPanelId: PanelId,
  position: 'top' | 'bottom' | 'left' | 'right'
): LayoutNode | null {
  const newNode: LayoutNode = { type: 'panel', id: newPanelId };
  if (!root) return newNode;

  const direction = position === 'top' || position === 'bottom' ? 'vertical' : 'horizontal';
  const insertAfter = position === 'bottom' || position === 'right';

  function traverse(node: LayoutNode): LayoutNode {
    if (node.type === 'panel') {
      if (node.id === targetId) {
        // Replace target panel with a new group containing the target and the new panel
        return {
          type: 'group',
          id: generateGroupId(),
          direction,
          children: insertAfter ? [node, newNode] : [newNode, node]
        };
      }
      return node;
    }

    if (node.type === 'group') {
      const targetIndex = node.children.findIndex(child => findNode(child, targetId) !== null);
      if (targetIndex !== -1) {
        const targetChild = node.children[targetIndex];
        
        // If the child is exactly the target panel, and this group is the same direction, we can just insert here
        if (targetChild.type === 'panel' && targetChild.id === targetId && node.direction === direction) {
          const newChildren = [...node.children];
          newChildren.splice(insertAfter ? targetIndex + 1 : targetIndex, 0, newNode);
          return { ...node, children: newChildren };
        }
        
        // Otherwise recurse into the child
        const newChildren = [...node.children];
        newChildren[targetIndex] = traverse(targetChild);
        return { ...node, children: newChildren };
      }
    }
    return node;
  }

  return normalizeTree(traverse(root));
}

/** Check if a panel exists in the tree */
export function hasPanel(node: LayoutNode | null, id: PanelId): boolean {
  if (!node) return false;
  return findNode(node, id) !== null;
}

/** Get the first leaf panel ID */
export function getFirstPanelId(node: LayoutNode): PanelId {
  if (node.type === 'panel') return node.id;
  return getFirstPanelId(node.children[0]);
}
