import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ApplicationForm } from './ui/ApplicationForm';
import { TreeCanvas, TreeCanvasRef } from './ui/TreeCanvas';
import { buildDecisionTree, calculateInformationGain, DataRow, traverseFuzzyTree, TreeNode, computeLeafResults, LeafResult } from './core/id3';
import { CrispInput, defuzzify, fuzzifyAll, FuzzySet } from './fuzzy/fuzzy';
import { ATTRIBUTES, generateTrainingData, PRESETS } from './data/presets';
import { Calculator, Play, Settings2, GitBranch, FileText, CheckCircle2, XCircle, PanelRightClose, PanelRightOpen, ChevronDown, Maximize, Eye } from 'lucide-react';

const BrandIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
    <rect width="32" height="32" rx="10" fill="url(#paint0_linear)" />
    <path d="M16 22V16M16 16L10 10M16 16L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="22" r="2.5" fill="white"/>
    <circle cx="10" cy="10" r="2.5" fill="white"/>
    <circle cx="22" cy="10" r="2.5" fill="white"/>
    <defs>
      <linearGradient id="paint0_linear" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1E1B4B" />
      </linearGradient>
    </defs>
  </svg>
);

export default function App() {
  const [trainingData, setTrainingData] = useState<DataRow[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [inputs, setInputs] = useState<CrispInput>(PRESETS["Ideal Candidate"]);
  const [submittedInputs, setSubmittedInputs] = useState<Record<string, FuzzySet> | null>(null);
  const [showIG, setShowIG] = useState(false);
  const [igData, setIgData] = useState<{ attr: string, gain: number }[]>([]);
  
  const [activeTab, setActiveTab] = useState<'form' | 'results'>('form');
  const [simulationDone, setSimulationDone] = useState(false);
  const [leafResults, setLeafResults] = useState<LeafResult[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [selectedPathResult, setSelectedPathResult] = useState<LeafResult | null>(null);
  const [highlightedPathNodeIds, setHighlightedPathNodeIds] = useState<string[] | null>(null);
  const presetDropdownRef = useRef<HTMLDivElement>(null);
  const treeCanvasRef = useRef<TreeCanvasRef>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Generate data and build tree on mount
    const data = generateTrainingData(300);
    setTrainingData(data);
    const newTree = buildDecisionTree(data, ATTRIBUTES, "Approved");
    setTree(newTree);
  }, []);

  const handleSimulationStart = useCallback(() => {
    setSimulationDone(false);
    setHighlightedPathNodeIds(null);
  }, []);

  const handleSimulationComplete = useCallback(() => {
    setSimulationDone(true);
  }, []);

  const handleStepChange = useCallback((nodeId: string | null) => {
    setActiveNodeId(nodeId);
  }, []);

  const handleCalculateIG = () => {
    const start = performance.now();
    const gains = ATTRIBUTES.map(attr => ({
      attr,
      gain: calculateInformationGain(trainingData, attr, "Approved")
    })).sort((a, b) => b.gain - a.gain);
    const end = performance.now();
    console.log(`IG calculated in ${end - start}ms`);
    setIgData(gains);
    setShowIG(true);
  };

  const handleSubmit = () => {
    setHighlightedPathNodeIds(null);
    const fuzzy = fuzzifyAll(inputs);
    setSubmittedInputs(fuzzy);
    if (tree) {
      setLeafResults(computeLeafResults(tree, fuzzy));
    }
    setSimulationDone(false);
    setActiveTab('results');
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setInputs(preset);
      setSubmittedInputs(null);
      setHighlightedPathNodeIds(null);
      setIsPresetDropdownOpen(false);
    }
  };

  const decision = useMemo(() => {
    if (!tree || !submittedInputs) return null;
    const probs = traverseFuzzyTree(tree, submittedInputs);
    return defuzzify(probs);
  }, [tree, submittedInputs]);

  const emptyFuzzyInputs = useMemo(() => ({}), []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center space-x-3">
          <BrandIcon />
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-slate-800">
            FuzzyFlow
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider ml-2">
            Beta
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center" ref={presetDropdownRef}>
            <button
              onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
              className="flex items-center justify-between w-44 bg-gray-50/50 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-4 pr-3 py-2.5 transition-all hover:bg-gray-100 cursor-pointer outline-none"
            >
              <span>Load Preset...</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isPresetDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50 overflow-hidden origin-top-right">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                  Available Presets
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {Object.keys(PRESETS).map(key => (
                    <button
                      key={key}
                      onClick={() => handlePresetChange(key)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleCalculateIG}
            className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-xl transition-all text-sm shadow-sm active:scale-95"
          >
            <Calculator className="w-4 h-4 text-gray-500" />
            <span>Information Gain</span>
          </button>
          
          <button 
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run Simulation</span>
          </button>

          <div className="w-px h-8 bg-gray-200 mx-2"></div>
          
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2.5 rounded-xl transition-all active:scale-95 ${isSidebarOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Tree Canvas */}
        <div className="flex-1 flex flex-col relative">
          <TreeCanvas 
            ref={treeCanvasRef}
            tree={tree} 
            fuzzyInputs={submittedInputs || emptyFuzzyInputs} 
            onSimulationComplete={handleSimulationComplete}
            onSimulationStart={handleSimulationStart}
            onStepChange={handleStepChange}
            highlightedPathNodeIds={highlightedPathNodeIds}
            onClearHighlight={() => setHighlightedPathNodeIds(null)}
          />
        </div>

        {/* Right Pane: Tabs */}
        <div 
          className="bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20 transition-all duration-300 ease-in-out shrink-0 overflow-hidden"
          style={{ width: isSidebarOpen ? '450px' : '0px' }}
        >
          <div className="w-[450px] flex flex-col h-full">
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('form')} 
                className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-colors flex items-center justify-center space-x-2 ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <FileText size={16} />
                <span>Application</span>
              </button>
              <button 
                onClick={() => setActiveTab('results')} 
                className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition-colors flex items-center justify-center space-x-2 ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <GitBranch size={16} />
                <span>Results</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
            <div className={`p-6 ${activeTab === 'form' ? 'block' : 'hidden'}`}>
              <ApplicationForm inputs={inputs} onChange={setInputs} />
            </div>
            
            {activeTab === 'results' && (
              <div className="p-6 space-y-6">
                {!decision ? (
                  <div className="text-center py-12 text-gray-500">
                    <GitBranch className="mx-auto mb-4 opacity-20" size={48} />
                    <p>Submit an application to see results.</p>
                  </div>
                ) : (
                  <>
                    {/* Overall Decision */}
                    <div className={`p-6 rounded-2xl border ${simulationDone ? (decision.decision === 'Approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'} transition-colors duration-500`}>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Overall Decision</p>
                      {simulationDone ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {decision.decision === 'Approved' ? <CheckCircle2 className="text-green-600" size={32} /> : <XCircle className="text-red-600" size={32} />}
                            <span className={`text-3xl font-extrabold ${decision.decision === 'Approved' ? 'text-green-700' : 'text-red-700'}`}>
                              {decision.decision}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-500">Likelihood</p>
                            <p className="text-2xl font-bold text-gray-900">{decision.likelihood.toFixed(1)}%</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 animate-pulse">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="h-8 bg-gray-200 rounded w-32"></div>
                        </div>
                      )}
                    </div>

                    {/* Leaf Nodes Breakdown */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Paths Evaluated</h3>
                      <div className="space-y-4">
                        {leafResults.map((leaf, idx) => {
                          const isActivePath = activeNodeId && leaf.pathNodeIds.includes(activeNodeId);
                          const isPathRevealed = simulationDone || isActivePath;
                          
                          return (
                          <div key={idx} className={`p-4 rounded-xl border transition-all duration-500 ${isPathRevealed ? (isActivePath && !simulationDone ? 'border-blue-400 bg-blue-50 shadow-md transform scale-[1.02]' : 'border-gray-200 bg-white') : 'border-gray-100 bg-gray-50 opacity-40'}`}>
                            <div className="flex justify-between items-center mb-3">
                              <span className={`text-xs font-bold px-2 py-1 rounded-md ${isActivePath && !simulationDone ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800'}`}>
                                Path Probability: {(leaf.probability * 100).toFixed(1)}%
                              </span>
                              <span className={`text-sm font-bold ${leaf.decision === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
                                {leaf.decision} ({(leaf.likelihood).toFixed(0)}%)
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {leaf.path.map((step, stepIdx) => (
                                <React.Fragment key={stepIdx}>
                                  <div className={`text-xs px-2 py-1 rounded border ${isActivePath && !simulationDone ? 'bg-white text-blue-900 border-blue-200 font-medium' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                    <span className="font-semibold">{step.attribute}:</span> {step.value}
                                  </div>
                                  {stepIdx < leaf.path.length - 1 && (
                                    <span className={`text-xs flex items-center ${isActivePath && !simulationDone ? 'text-blue-400' : 'text-gray-400'}`}>→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>

                            <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setHighlightedPathNodeIds(leaf.pathNodeIds);
                                  treeCanvasRef.current?.fitToNodes(leaf.pathNodeIds);
                                }}
                                className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                              >
                                <Maximize size={14} />
                                <span>Fit Path</span>
                              </button>
                              <button
                                onClick={() => setSelectedPathResult(leaf)}
                                className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                              >
                                <Eye size={14} />
                                <span>View Path</span>
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </main>

      {/* IG Modal */}
      {showIG && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Information Gain (IG)</h3>
              <button onClick={() => setShowIG(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {igData.map((item, i) => (
                <div key={item.attr} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <span className="font-medium text-sm">{i + 1}. {item.attr}</span>
                  <span className="font-mono text-sm text-blue-600">{item.gain.toFixed(4)} bits</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Calculated over {trainingData.length} training samples.
            </p>
          </div>
        </div>
      )}

      {/* Path Modal */}
      {selectedPathResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Evaluated Path</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Path Probability: <span className="font-semibold text-blue-600">{(selectedPathResult.probability * 100).toFixed(2)}%</span>
                </p>
              </div>
              <button onClick={() => setSelectedPathResult(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="max-w-md mx-auto space-y-0">
                {selectedPathResult.path.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    {/* Node */}
                    <div className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm text-center relative z-10">
                      <span className="text-sm font-bold text-gray-800">{step.attribute}</span>
                    </div>
                    
                    {/* Edge */}
                    <div className="h-16 w-0.5 bg-blue-200 relative flex items-center justify-center">
                      <div className="absolute bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm z-20">
                        {step.value}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Final Leaf Node */}
                <div className="flex flex-col items-center">
                  <div className={`w-full border-2 rounded-xl p-5 shadow-lg text-center relative z-10 ${selectedPathResult.decision === 'Approved' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-500 text-white shadow-rose-500/20'}`}>
                    <span className="text-xl font-extrabold tracking-wide uppercase">{selectedPathResult.decision}</span>
                    <div className="mt-2 text-sm font-medium opacity-90">
                      Likelihood: {selectedPathResult.likelihood.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
