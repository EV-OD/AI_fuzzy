import React, { useMemo, useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { LayoutNode, layoutTree } from "./TreeLayout";
import { TreeNode } from "../core/id3";
import { FuzzySet } from "../fuzzy/fuzzy";
import { ZoomIn, ZoomOut, Maximize, Play, Pause, FastForward, RotateCcw, Focus } from 'lucide-react';

export interface TreeCanvasRef {
  fitToNodes: (nodeIds: string[]) => void;
}

interface TreeCanvasProps {
  tree: TreeNode | null;
  fuzzyInputs: Record<string, FuzzySet>;
  onSimulationComplete?: () => void;
  onSimulationStart?: () => void;
  onStepChange?: (nodeId: string | null) => void;
  highlightedPathNodeIds?: string[] | null;
  onClearHighlight?: () => void;
}

interface DfsStep {
  node: LayoutNode;
  pathEdges: Set<string>;
  prob: number;
}

export const TreeCanvas = forwardRef<TreeCanvasRef, TreeCanvasProps>(({ tree, fuzzyInputs, onSimulationComplete, onSimulationStart, onStepChange, highlightedPathNodeIds, onClearHighlight }, ref) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 400, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<DfsStep[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  
  const [isManualZooming, setIsManualZooming] = useState(false);
  const manualZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      setIsManualZooming(true);
      if (manualZoomTimeoutRef.current) clearTimeout(manualZoomTimeoutRef.current);
      manualZoomTimeoutRef.current = setTimeout(() => {
        setIsManualZooming(false);
      }, 100);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom(prevZoom => {
        const newZoom = Math.max(0.1, Math.min(3, prevZoom - e.deltaY * 0.001));
        
        setPan(prevPan => {
          const svgX = (mouseX - prevPan.x) / prevZoom;
          const svgY = (mouseY - prevPan.y) / prevZoom;
          
          return {
            x: mouseX - svgX * newZoom,
            y: mouseY - svgY * newZoom
          };
        });
        
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleManualZoom = useCallback((factor: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    setIsManualZooming(true);
    if (manualZoomTimeoutRef.current) clearTimeout(manualZoomTimeoutRef.current);
    manualZoomTimeoutRef.current = setTimeout(() => {
      setIsManualZooming(false);
    }, 100);

    setZoom(prevZoom => {
      const newZoom = Math.max(0.1, Math.min(3, prevZoom * factor));
      
      setPan(prevPan => {
        const cx = clientWidth / 2;
        const cy = clientHeight / 2;
        
        const svgX = (cx - prevPan.x) / prevZoom;
        const svgY = (cy - prevPan.y) / prevZoom;
        
        return {
          x: cx - svgX * newZoom,
          y: cy - svgY * newZoom
        };
      });
      
      return newZoom;
    });
  }, []);

  const layout = useMemo(() => {
    if (!tree) return null;
    return layoutTree(tree);
  }, [tree]);

  const handleFit = useCallback(() => {
    if (onClearHighlight) onClearHighlight();
    if (!containerRef.current || !layout) return;
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    function findBounds(node: LayoutNode) {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;
      for (const key in node.children) findBounds(node.children[key]);
    }
    findBounds(layout);

    const { clientWidth, clientHeight } = containerRef.current;
    const treeW = maxX - minX + 240;
    const treeH = maxY + 120;
    const scaleX = clientWidth / treeW;
    const scaleY = clientHeight / treeH;
    const newZoom = Math.min(scaleX, scaleY, 1.5) * 0.9;
    
    const centerX = (minX + maxX) / 2;
    const centerY = maxY / 2;

    setZoom(newZoom);
    setPan({
      x: clientWidth / 2 - centerX * newZoom,
      y: clientHeight / 2 - (50 + centerY) * newZoom
    });
  }, [layout]);

  const handleFitPath = useCallback(() => {
    if (onClearHighlight) onClearHighlight();
    if (!containerRef.current || steps.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    steps.forEach(step => {
      if (step.node.x < minX) minX = step.node.x;
      if (step.node.x > maxX) maxX = step.node.x;
      if (step.node.y < minY) minY = step.node.y;
      if (step.node.y > maxY) maxY = step.node.y;
    });

    if (minX === Infinity) return;

    const { clientWidth, clientHeight } = containerRef.current;
    const pathW = maxX - minX + 240;
    const pathH = maxY - minY + 160;
    const scaleX = clientWidth / pathW;
    const scaleY = clientHeight / pathH;
    const newZoom = Math.min(scaleX, scaleY, 1.5) * 0.9;
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: clientWidth / 2 - centerX * newZoom,
      y: clientHeight / 2 - centerY * newZoom
    });
  }, [steps]);

  useImperativeHandle(ref, () => ({
    fitToNodes: (nodeIds: string[]) => {
      if (!containerRef.current || !layout || nodeIds.length === 0) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

      function findBounds(node: LayoutNode) {
        if (nodeIds.includes(node.node.id)) {
          if (node.x < minX) minX = node.x;
          if (node.x > maxX) maxX = node.x;
          if (node.y < minY) minY = node.y;
          if (node.y > maxY) maxY = node.y;
        }
        for (const key in node.children) findBounds(node.children[key]);
      }
      findBounds(layout);

      if (minX === Infinity) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const pathW = maxX - minX + 240;
      const pathH = maxY - minY + 160;
      const scaleX = clientWidth / pathW;
      const scaleY = clientHeight / pathH;
      const newZoom = Math.min(scaleX, scaleY, 1.5) * 0.9;
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setZoom(newZoom);
      setPan({
        x: clientWidth / 2 - centerX * newZoom,
        y: clientHeight / 2 - centerY * newZoom
      });
    }
  }));

  // Generate DFS Steps
  useEffect(() => {
    if (!layout) return;
    if (Object.keys(fuzzyInputs).length === 0) {
      setSteps([]);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      handleFit();
      return;
    }

    const newSteps: DfsStep[] = [];
    function traverse(node: LayoutNode, currentEdges: Set<string>, prob: number) {
      newSteps.push({ node, pathEdges: new Set(currentEdges), prob });
      if (node.node.isLeaf) return;
      
      const attr = node.node.attribute;
      const fuzzySet = attr ? fuzzyInputs[attr] : null;
      
      let totalWeight = 0;
      if (fuzzySet && fuzzySet["Unknown"] !== 1) {
        for (const key in node.children) {
          totalWeight += (fuzzySet[key] || 0);
        }
      }

      for (const key in node.children) {
        const child = node.children[key];
        let edgeProb = prob;
        if (fuzzySet && fuzzySet["Unknown"] !== 1) {
          if (totalWeight > 0) {
            edgeProb *= (fuzzySet[key] || 0);
          } else {
            edgeProb *= (node.node.branchWeights?.[key] || 0);
          }
        } else if (fuzzySet && fuzzySet["Unknown"] === 1) {
          edgeProb *= (node.node.branchWeights?.[key] || 0);
        }
        
        if (edgeProb > 0) {
          const newEdges = new Set(currentEdges);
          newEdges.add(`${node.node.id}-${child.node.id}`);
          traverse(child, newEdges, edgeProb);
          // Backtrack step
          newSteps.push({ node, pathEdges: new Set(currentEdges), prob });
        }
      }
    }
    traverse(layout, new Set(), 1);
    setSteps(newSteps);
    setCurrentStepIndex(0);
    setIsPlaying(true);
    if (onSimulationStart) onSimulationStart();
  }, [layout, fuzzyInputs, onSimulationStart]); // Removed handleFit to prevent infinite loop

  // Simulation Interval
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const interval = setInterval(() => {
      setCurrentStepIndex(idx => {
        if (idx >= steps.length - 1) {
          return idx;
        }
        return idx + 1;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed, steps.length]);

  // Handle simulation completion
  useEffect(() => {
    if (isPlaying && steps.length > 0 && currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
      if (onSimulationComplete) onSimulationComplete();
    }
  }, [currentStepIndex, steps.length, isPlaying, onSimulationComplete]);

  // Auto-pan to current node during simulation
  useEffect(() => {
    if (!isPlaying || steps.length === 0 || !containerRef.current) return;
    
    if (currentStepIndex >= steps.length - 1) {
      handleFitPath();
      return;
    }

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    const { clientWidth, clientHeight } = containerRef.current;
    const targetZoom = 1.2;
    
    setZoom(targetZoom);
    setPan({
      x: clientWidth / 2 - currentStep.node.x * targetZoom,
      y: clientHeight / 2 - (50 + currentStep.node.y) * targetZoom
    });
  }, [currentStepIndex, isPlaying, steps, handleFitPath]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Pre-calculate visited nodes and edges for rendering
  const visitedNodes = useMemo(() => {
    const vNodes = new Set<string>();
    if (steps.length === 0) return vNodes; // Empty means everything is revealed later
    for (let i = 0; i <= currentStepIndex; i++) {
      if (steps[i]) vNodes.add(steps[i].node.node.id);
    }
    return vNodes;
  }, [steps, currentStepIndex]);

  const visitedEdges = useMemo(() => {
    const vEdges = new Set<string>();
    if (steps.length === 0) return vEdges;
    for (let i = 0; i <= currentStepIndex; i++) {
      if (steps[i]) steps[i].pathEdges.forEach(e => vEdges.add(e));
    }
    return vEdges;
  }, [steps, currentStepIndex]);

  const currentStep = steps.length > 0 ? steps[currentStepIndex] : null;

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep ? currentStep.node.node.id : null);
    }
  }, [currentStep, onStepChange]);

  function renderNode(node: LayoutNode): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    const isRevealed = steps.length === 0 || visitedNodes.has(node.node.id);
    const isCurrent = currentStep?.node.node.id === node.node.id;

    const hasHighlight = !!(highlightedPathNodeIds && highlightedPathNodeIds.length > 0);
    const isHighlighted = hasHighlight ? highlightedPathNodeIds.includes(node.node.id) : false;

    for (const key in node.children) {
      const child = node.children[key];
      const edgeId = `${node.node.id}-${child.node.id}`;
      const isEdgeRevealed = steps.length === 0 || visitedEdges.has(edgeId);
      const isEdgeActive = currentStep?.pathEdges.has(edgeId) || false;
      const isEdgeHighlighted = hasHighlight ? (highlightedPathNodeIds.includes(node.node.id) && highlightedPathNodeIds.includes(child.node.id)) : false;
      
      let branchProb = 0;
      if (node.node.attribute) {
        const fuzzySet = fuzzyInputs[node.node.attribute];
        
        let totalWeight = 0;
        if (fuzzySet && fuzzySet["Unknown"] !== 1) {
          for (const k in node.children) {
            totalWeight += (fuzzySet[k] || 0);
          }
        }

        if (fuzzySet && fuzzySet["Unknown"] !== 1) {
          if (totalWeight > 0) {
            branchProb = (fuzzySet[key] || 0);
          } else {
            branchProb = (node.node.branchWeights?.[key] || 0);
          }
        } else if (fuzzySet && fuzzySet["Unknown"] === 1) {
          branchProb = (node.node.branchWeights?.[key] || 0);
        } else if (Object.keys(fuzzyInputs).length === 0) {
          branchProb = 1; // Default state
        }
      }

      let strokeWidth = isEdgeActive ? Math.max(2, branchProb * 6) : 2;
      let strokeColor = isEdgeActive ? `rgba(59, 130, 246, ${Math.max(0.4, branchProb)})` : (isEdgeRevealed ? "#6b7280" : "#e5e7eb");

      if (hasHighlight && isEdgeHighlighted) {
        strokeWidth = Math.max(4, strokeWidth);
        strokeColor = "#3b82f6";
      }

      const edgeOpacity = hasHighlight ? (isEdgeHighlighted ? 1 : 0.15) : 1;

      let labelClass = "bg-gray-50 text-gray-400 border-gray-100";
      if (hasHighlight) {
        if (isEdgeHighlighted) {
          labelClass = "bg-blue-100 text-blue-800 border-blue-400 ring-2 ring-blue-200";
        } else {
          labelClass = "bg-white text-gray-400 border-gray-200";
        }
      } else {
        if (isEdgeActive) {
          labelClass = "bg-blue-100 text-blue-800 border-blue-300";
        } else if (isEdgeRevealed) {
          labelClass = "bg-white text-gray-600 border-gray-200";
        }
      }

      const midX = (node.x + child.x) / 2;
      const midY = (node.y + child.y) / 2;

      elements.push(
        <g key={`edge-${edgeId}`} style={{ opacity: edgeOpacity }} className="transition-all duration-500">
          <path
            d={`M ${node.x} ${node.y + 35} C ${node.x} ${node.y + 35 + 40}, ${child.x} ${child.y - 35 - 40}, ${child.x} ${child.y - 35}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="transition-all duration-500"
          />
          <foreignObject
            x={midX - 60}
            y={midY - 14}
            width="120"
            height="28"
            overflow="visible"
          >
            <div className="flex items-center justify-center w-full h-full">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm transition-all duration-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${labelClass}`}>
                {key}
              </span>
            </div>
          </foreignObject>
          {renderNode(child)}
        </g>
      );
    }

    const isLeaf = node.node.isLeaf;
    const isApproved = isLeaf && (node.node.probabilities?.["Approved"] || 0) >= 0.5;
    
    let nodeBg = "bg-white";
    let nodeBorder = "border-gray-200";
    let textColor = "text-gray-800";
    let shadow = "shadow-sm";

    if (isLeaf && isRevealed) {
      nodeBg = isApproved ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "bg-gradient-to-br from-rose-400 to-rose-600";
      nodeBorder = isApproved ? "border-emerald-500" : "border-rose-500";
      textColor = "text-white";
      shadow = "shadow-xl shadow-emerald-500/20";
      if (!isApproved) shadow = "shadow-xl shadow-rose-500/20";
    } else if (isCurrent) {
      nodeBg = "bg-gradient-to-br from-blue-50 to-blue-100";
      nodeBorder = "border-blue-500";
      textColor = "text-blue-900";
      shadow = "shadow-xl shadow-blue-500/30";
    } else if (isRevealed) {
      nodeBg = "bg-gradient-to-br from-white to-gray-50";
      nodeBorder = "border-gray-300";
      textColor = "text-gray-800";
      shadow = "shadow-md";
    } else {
      nodeBg = "bg-gray-50";
      nodeBorder = "border-gray-200";
      textColor = "text-gray-400";
      shadow = "shadow-sm";
    }

    const nodeOpacity = hasHighlight ? (isHighlighted ? 1 : 0.15) : (isRevealed ? 1 : 0.4);
    const highlightRing = hasHighlight && isHighlighted ? 'ring-4 ring-blue-400 ring-offset-2 ring-offset-gray-50 scale-105' : '';

    elements.push(
      <g key={`node-${node.node.id}`} transform={`translate(${node.x}, ${node.y})`} style={{ opacity: nodeOpacity }} className="transition-all duration-500">
        {isCurrent && (
          <rect x="-84" y="-39" width="168" height="78" rx="14" fill="none" stroke="#3b82f6" strokeWidth="4" className="animate-ping opacity-75" />
        )}
        <foreignObject x="-80" y="-35" width="160" height="70" overflow="visible">
          <div className={`w-full h-full flex flex-col items-center justify-center rounded-xl border-2 ${nodeBg} ${nodeBorder} ${textColor} ${shadow} ${highlightRing} transition-all duration-500 p-2 text-center`}>
            <span className={`font-bold leading-tight ${isLeaf ? 'text-lg' : 'text-sm'} line-clamp-2`}>
              {isLeaf ? (isApproved ? "Approved" : "Rejected") : node.node.attribute}
            </span>
            {isLeaf && (
              <span className="text-xs mt-1 opacity-90 font-medium tracking-wide">
                {((node.node.probabilities?.["Approved"] || 0) * 100).toFixed(0)}% / {((node.node.probabilities?.["Rejected"] || 0) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </foreignObject>
      </g>
    );

    return elements;
  }

  if (!layout) return <div className="flex-1 flex items-center justify-center text-gray-500">No tree data</div>;

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing relative select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Subtle dot pattern background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`
        }}
      ></div>

      <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-gray-200 z-30 flex items-center space-x-3">
        <button onClick={() => handleManualZoom(1.4)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Zoom In"><ZoomIn size={20}/></button>
        <button onClick={() => handleManualZoom(1 / 1.4)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Zoom Out"><ZoomOut size={20}/></button>
        <button onClick={handleFit} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Fit Entire Tree"><Maximize size={20}/></button>
        {steps.length > 0 && (
          <button onClick={handleFitPath} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Fit Path Taken"><Focus size={20}/></button>
        )}
        
        <div className="w-px h-8 bg-gray-200 mx-2"></div>
        
        <button onClick={() => {
          if (steps.length > 0 && currentStepIndex >= steps.length - 1) setCurrentStepIndex(0);
          setIsPlaying(!isPlaying);
        }} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={20}/> : ((steps.length > 0 && currentStepIndex >= steps.length - 1) ? <RotateCcw size={20}/> : <Play size={20}/>)}
        </button>
        
        <div className="flex items-center space-x-2 px-2">
          <FastForward size={16} className="text-gray-400" />
          <input 
            type="range" min="200" max="2000" step="100" 
            value={2200 - speed} 
            onChange={e => setSpeed(2200 - parseInt(e.target.value))} 
            className="w-24 accent-blue-600"
            title="Simulation Speed"
          />
        </div>
      </div>

      <svg 
        width="100%" 
        height="100%" 
        style={{ transformOrigin: '0 0' }}
      >
        <g 
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transition: (isDragging || isManualZooming) ? 'none' : `transform ${Math.min(speed * 0.8, 500)}ms ease-in-out` }}
        >
          <g transform={`translate(0, 50)`}>
            {renderNode(layout)}
          </g>
        </g>
      </svg>
    </div>
  );
});
