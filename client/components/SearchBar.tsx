'use client';

import { useState } from 'react';
import { Researcher, getInstitution, getInterestsString } from '@/types/profile';

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
      <h3 className="text-lg font-black mb-3" style={{ color: 'var(--text)' }}>Find Researchers by Keyword</h3>
      <input
        type="text"
        placeholder="Search by name, institution, or interests..."
        value={query}
        onChange={handleChange}
        onFocus={() => query.length > 0 && setShowDropdown(true)}
        onBlur={handleBlur}
        className="input w-full"
      />

      {/* Dropdown Results */}
      {showDropdown && isSearching && (
        <div className="absolute z-10 w-full mt-2 max-h-75 overflow-y-auto" style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '2px 2px 0 var(--border)' }}>
          {searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              No researchers found matching your search.
            </div>
          ) : (
            searchResults.slice(0, 10).map((researcher) => (
              <div
                key={researcher.id}
                onClick={() => handleSelectResearcher(researcher)}
                className="px-4 py-3 cursor-pointer"
                style={{ borderBottom: '1px solid var(--border-light)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{researcher.name}</h4>
                  {researcher.similarity_score !== undefined && researcher.similarity_score > 0 && (
                    <span className="tag tag-accent text-xs">
                      Match: {researcher.similarity_score}
                    </span>
                  )}
                </div>
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{getInstitution(researcher) || 'Institution not specified'}</p>
                {researcher.interest_areas && researcher.interest_areas.length > 0 && (
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                    {getInterestsString(researcher)}
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
