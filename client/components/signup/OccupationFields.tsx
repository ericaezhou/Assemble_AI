import { YEAR_OPTIONS, EXPERIENCE_OPTIONS, DEGREE_OPTIONS } from '@/utils/profileOptions';

interface OccupationData {
  school?: string;
  major?: string;
  year?: string;
  company?: string;
  title?: string;
  work_experience_years?: string;
  degree?: string;
  research_area?: string;
  other_description?: string;
}

interface OccupationFieldsProps {
  occupation: string;
  data: OccupationData;
  onChange: (field: string, value: string) => void;
}

export default function OccupationFields({ occupation, data, onChange }: OccupationFieldsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(e.target.name, e.target.value);
  };

  if (occupation === 'Student') {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="school" className="block mb-2 text-gray-700 font-medium text-sm">
            School *
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={data.school || ''}
            onChange={handleChange}
            required
            placeholder="e.g., MIT, Stanford University"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="major" className="block mb-2 text-gray-700 font-medium text-sm">
            Major *
          </label>
          <input
            type="text"
            id="major"
            name="major"
            value={data.major || ''}
            onChange={handleChange}
            required
            placeholder="e.g., Computer Science, Electrical Engineering"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="year" className="block mb-2 text-gray-700 font-medium text-sm">
            Year *
          </label>
          <select
            id="year"
            name="year"
            value={data.year || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="">Select your year</option>
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (occupation === 'Professional') {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="company" className="block mb-2 text-gray-700 font-medium text-sm">
            Company *
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={data.company || ''}
            onChange={handleChange}
            required
            placeholder="e.g., Google, Microsoft, Startup Inc"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="title" className="block mb-2 text-gray-700 font-medium text-sm">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={data.title || ''}
            onChange={handleChange}
            required
            placeholder="e.g., Software Engineer, Product Manager"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="work_experience_years" className="block mb-2 text-gray-700 font-medium text-sm">
            Years of Experience *
          </label>
          <select
            id="work_experience_years"
            name="work_experience_years"
            value={data.work_experience_years || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="">Select experience level</option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="degree" className="block mb-2 text-gray-700 font-medium text-sm">
            Highest Degree *
          </label>
          <select
            id="degree"
            name="degree"
            value={data.degree || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="">Select degree</option>
            {DEGREE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="school" className="block mb-2 text-gray-700 font-medium text-sm">
            Most Recent School *
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={data.school || ''}
            onChange={handleChange}
            required
            placeholder="e.g., MIT, Stanford University"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    );
  }

  if (occupation === 'Researcher') {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="school" className="block mb-2 text-gray-700 font-medium text-sm">
            Institution *
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={data.school || ''}
            onChange={handleChange}
            required
            placeholder="e.g., MIT, Stanford University, Research Lab"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="research_area" className="block mb-2 text-gray-700 font-medium text-sm">
            Research Area *
          </label>
          <input
            type="text"
            id="research_area"
            name="research_area"
            value={data.research_area || ''}
            onChange={handleChange}
            required
            placeholder="e.g., Machine Learning, Quantum Computing"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="degree" className="block mb-2 text-gray-700 font-medium text-sm">
            Degree *
          </label>
          <select
            id="degree"
            name="degree"
            value={data.degree || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="">Select degree</option>
            <option value="Bachelor's">Bachelor's</option>
            <option value="Master's">Master's</option>
            <option value="PhD">PhD</option>
          </select>
        </div>
      </div>
    );
  }

  if (occupation === 'Other') {
    return (
      <div className="space-y-5">
        <div>
          <label htmlFor="other_description" className="block mb-2 text-gray-700 font-medium text-sm">
            What have you been up to? *
          </label>
          <textarea
            id="other_description"
            name="other_description"
            value={data.other_description || ''}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Tell us about your background, projects, or what you're currently working on..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors resize-y"
          />
        </div>

        <div>
          <label htmlFor="degree" className="block mb-2 text-gray-700 font-medium text-sm">
            Highest Degree *
          </label>
          <select
            id="degree"
            name="degree"
            value={data.degree || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          >
            <option value="">Select degree</option>
            {DEGREE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="school" className="block mb-2 text-gray-700 font-medium text-sm">
            Most Recent School
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={data.school || ''}
            onChange={handleChange}
            placeholder="e.g., MIT, Stanford University (optional)"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>
    );
  }

  return null;
}
