'use client';

import { useState } from 'react';

interface Researcher {
  id: number;
  name: string;
  email: string;
  institution: string;
  research_areas: string;
  bio: string;
  interests: string;
  similarity_score?: number;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchResults: Researcher[];
  isSearching: boolean;
  onSelectResearcher: (researcher: Researcher) => void;
}

export default function SearchBar({ onSearch, searchResults, isSearching, onSelectResearcher }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
    setShowDropdown(value.length > 0);
  };

  const handleSelectResearcher = (researcher: Researcher) => {
    onSelectResearcher(researcher);
    setQuery('');
    setShowDropdown(false);
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="relative w-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Find Researchers by Keyword</h3>
      <input
        type="text"
        placeholder="Search by name, institution, or interests..."
        value={query}
        onChange={handleChange}
        onFocus={() => query.length > 0 && setShowDropdown(true)}
        onBlur={handleBlur}
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
      />

      {/* Dropdown Results */}
      {showDropdown && isSearching && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-75 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No researchers found matching your search.
            </div>
          ) : (
            searchResults.slice(0, 10).map((researcher) => (
              <div
                key={researcher.id}
                onClick={() => handleSelectResearcher(researcher)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-gray-800">{researcher.name}</h4>
                  {researcher.similarity_score !== undefined && researcher.similarity_score > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                      Match: {researcher.similarity_score}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 italic">{researcher.institution || 'Institution not specified'}</p>
                {researcher.interests && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {researcher.interests}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
