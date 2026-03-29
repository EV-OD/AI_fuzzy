import React from "react";
import { CrispInput } from "../fuzzy/fuzzy";

interface ApplicationFormProps {
  inputs: CrispInput;
  onChange: (inputs: CrispInput) => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ inputs, onChange }) => {
  const handleChange = (key: keyof CrispInput, value: number | string | null) => {
    onChange({ ...inputs, [key]: value });
  };

  const renderSlider = (label: string, key: keyof CrispInput, min: number, max: number, step: number = 1, unit: string = "") => {
    const isUnknown = inputs[key] === null;
    const value = isUnknown ? min : (inputs[key] as number);
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">{label}</label>
          <label className="flex items-center space-x-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={isUnknown}
              onChange={(e) => handleChange(key, e.target.checked ? null : min)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 transition-all"
            />
            <span className="font-medium">Unknown</span>
          </label>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 flex items-center h-6">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              disabled={isUnknown}
              className={`absolute w-full h-2 appearance-none cursor-pointer rounded-full outline-none transition-all
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-110
                [&::-webkit-slider-thumb]:transition-transform
                ${isUnknown ? 'opacity-40 cursor-not-allowed grayscale' : ''}
              `}
              style={{
                background: `linear-gradient(to right, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%)`
              }}
            />
          </div>
          <div className={`text-sm font-bold w-20 text-right bg-gray-50 px-2 py-1.5 rounded-lg border ${isUnknown ? 'text-gray-400 border-gray-100' : 'text-blue-700 border-blue-100 shadow-sm'}`}>
            {isUnknown ? "---" : `${value}${unit}`}
          </div>
        </div>
      </div>
    );
  };

  const renderSelect = (label: string, key: keyof CrispInput, options: string[]) => {
    const isUnknown = inputs[key] === null;
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">{label}</label>
          <label className="flex items-center space-x-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={isUnknown}
              onChange={(e) => handleChange(key, e.target.checked ? null : options[0])}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 transition-all"
            />
            <span className="font-medium">Unknown</span>
          </label>
        </div>
        <div className="relative">
          <select
            value={isUnknown ? "" : (inputs[key] as string)}
            onChange={(e) => handleChange(key, e.target.value)}
            disabled={isUnknown}
            className={`appearance-none block w-full pl-4 pr-10 py-2.5 text-sm font-medium border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl transition-all shadow-sm ${isUnknown ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900 hover:border-gray-300 cursor-pointer'}`}
          >
            {isUnknown && <option value="">---</option>}
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Application Form</h2>
      
      {renderSlider("Credit Score", "creditScore", 300, 850)}
      {renderSlider("DTI Ratio", "dti", 0, 100, 1, "%")}
      {renderSlider("Annual Income", "income", 0, 200000, 1000, "$")}
      {renderSlider("Employment History", "employment", 0, 40, 1, "y")}
      {renderSlider("LTV Ratio", "ltv", 0, 100, 1, "%")}
      {renderSlider("Savings Liquidity", "savings", 0, 100000, 1000, "$")}
      {renderSlider("Previous Defaults", "defaults", 0, 10)}
      {renderSelect("Collateral Quality", "collateral", ["Depreciating", "Stable", "Appreciating"])}
      {renderSlider("Age", "age", 18, 100)}
      {renderSlider("Existing Loan Count", "existingLoans", 0, 10)}
    </div>
  );
};
