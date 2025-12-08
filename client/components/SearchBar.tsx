'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-lg">
      <input
        type="text"
        placeholder="Search researchers by name, institution, or interests..."
        value={query}
        onChange={handleChange}
        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none transition-colors"
      />
      <button
        type="submit"
        className="px-6 py-2.5 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
