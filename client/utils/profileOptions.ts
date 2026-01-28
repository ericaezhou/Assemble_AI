export interface Option {
  value: string;
  label: string;
  description: string;
  icon?: string;
}

export const INTEREST_AREAS: Option[] = [
  { value: 'ai-agents', label: 'AI Agents', icon: '👾', description: 'Digital creatures that try to please their masters' },
  { value: 'machine-learning', label: 'Machine Learning', icon: '🧠', description: 'Teaching computers to learn from experience' },
  { value: 'computer-vision', label: 'Computer Vision', icon: '👀', description: 'Giving machines the gift of sight' },
  { value: 'nlp', label: 'NLP', icon: '💬', description: 'Helping computers understand human gibberish' },
  { value: 'robotics', label: 'Robotics', icon: '🤖', description: 'Building our future overlords' },
  { value: 'quantum-computing', label: 'Quantum Computing', icon: '⚛️', description: 'Computing with both 0 and 1 at the same time' },
  { value: 'blockchain', label: 'Blockchain', icon: '⛓️', description: 'Digital trust issues solved' },
  { value: 'ar-vr', label: 'AR/VR', icon: '🕶️', description: 'Blurring reality since 2010' },
  { value: 'cybersecurity', label: 'Cybersecurity', icon: '🛡️', description: 'Digital fortress building' },
  { value: 'data-science', label: 'Data Science', icon: '🔍', description: 'Finding needles in data haystacks' },
  { value: 'cloud-computing', label: 'Cloud Computing', icon: '☁️', description: 'Someone else\'s computer' },
  { value: 'iot', label: 'IoT', icon: '🌐', description: 'Making everything smart (even your toaster)' },
  { value: 'game-dev', label: 'Game Development', icon: '🎮', description: 'Creating digital playgrounds' },
  { value: 'web3', label: 'Web3', icon: '🌍', description: 'The internet, but decentralized' },
  { value: 'bioinformatics', label: 'Bioinformatics', icon: '🧬', description: 'When biology meets code' },
  { value: 'edge-computing', label: 'Edge Computing', icon: '⚡', description: 'Computing at the edge of the network' },
  { value: 'autonomous-systems', label: 'Autonomous Systems', icon: '🚗', description: 'Self-driving everything' },
  { value: 'hci', label: 'Human-Computer Interaction', icon: '🤝', description: 'Making tech less awkward for humans' },
];


export const SKILLS: Option[] = [
  { value: 'frontend', label: 'Frontend', icon: '🎨', description: 'Making pixels dance on screens' },
  { value: 'backend', label: 'Backend', icon: '⚙️', description: 'Where the magic actually happens' },
  { value: 'fullstack', label: 'Full Stack', icon: '🧩', description: 'Jack of all trades, master of... both?' },
  { value: 'mobile', label: 'Mobile Development', icon: '📱', description: 'Apps in your pocket' },
  { value: 'devops', label: 'DevOps', icon: '🔧', description: 'Keeping the servers happy' },
  { value: 'ui-ux', label: 'UI/UX Design', icon: '🖌️', description: 'Making things pretty AND functional' },
  { value: 'data-engineering', label: 'Data Engineering', icon: '💾', description: 'Plumbing for data' },
  { value: 'ml-engineering', label: 'ML Engineering', icon: '🤖', description: 'Teaching silicon to think' },
  { value: 'system-design', label: 'System Design', icon: '🏛️', description: 'Architecting digital empires' },
  { value: 'api-development', label: 'API Development', icon: '🌉', description: 'Building bridges between systems' },
  { value: 'database-design', label: 'Database Design', icon: '🗄️', description: 'Organizing digital chaos' },
  { value: 'cloud-architecture', label: 'Cloud Architecture', icon: '☁️', description: 'Building castles in the cloud' },
  { value: 'security-engineering', label: 'Security Engineering', icon: '🛡️', description: 'Defending the digital realm' },
  { value: 'qa-testing', label: 'QA/Testing', icon: '🔍', description: 'Professional bug hunter' },
  { value: 'technical-writing', label: 'Technical Writing', icon: '✍️', description: 'Explaining complex things simply' },
];


export const HOBBIES: Option[] = [
  { value: 'gaming', label: 'Gaming', icon: '🎮', description: 'Virtual adventures and competitive glory' },
  { value: 'hiking', label: 'Hiking', icon: '🥾', description: 'Walking but make it scenic' },
  { value: 'rock-climbing', label: 'Rock Climbing', icon: '🧗', description: 'Defying gravity, one hold at a time' },
  { value: 'gym', label: 'Gym Rat', icon: '🏋️', description: 'Lifting heavy things for fun' },
  { value: 'matcha', label: 'Matcha', icon: '🍵', description: 'Green tea obsession level: expert' },
  { value: 'coffee', label: 'Dim Sum', icon: '🥢', description: 'Espresso yourself' },
  { value: 'cooking', label: 'Cooking', icon: '🍳', description: 'Chef mode activated' },
  { value: 'photography', label: 'Photography', icon: '📷', description: 'Capturing moments, one click at a time' },
  { value: 'reading', label: 'Reading', icon: '📚', description: 'Professional page turner' },
  { value: 'music', label: 'Music', icon: '🎵', description: 'Life with a soundtrack' },
  { value: 'art', label: 'Art', icon: '🎨', description: 'Creating visual magic' },
  { value: 'travel', label: 'Travel', icon: '✈️', description: 'Passport stamp collector' },
  { value: 'yoga', label: 'Yoga', icon: '🧘', description: 'Stretching towards zen' },
  { value: 'running', label: 'Strava', icon: '🏃', description: 'Miles and smiles' },
  { value: 'board-games', label: 'Board Games', icon: '🎲', description: 'Analog gaming enthusiast' },
  { value: 'dancing', label: 'Dancing', icon: '💃', description: 'Moving to the beat' },
  { value: 'writing', label: 'Writing', icon: '✍️', description: 'Crafting stories and ideas' },
  { value: 'anime', label: 'Anime', icon: '🇯🇵', description: 'Living that otaku life' },
];

export const YEAR_OPTIONS = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Graduate',
];

export const EXPERIENCE_OPTIONS = [
  '0-1 years',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

export const DEGREE_OPTIONS = [
  'High School',
  'Associate',
  "Bachelor's",
  "Master's",
  'PhD',
  'None',
];

export const OCCUPATION_OPTIONS = [
  'Student',
  'Professional',
  'Researcher',
  'Other',
];
