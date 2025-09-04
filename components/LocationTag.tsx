import React from 'react';

const colors = [
  { bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { bgColor: 'bg-green-100', textColor: 'text-green-800' },
  { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  { bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  { bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  { bgColor: 'bg-red-100', textColor: 'text-red-800' },
  { bgColor: 'bg-gray-200', textColor: 'text-gray-800' },
];

const getLocationColors = (locationName: string): { bgColor: string; textColor: string } => {
  if (!locationName) {
    return colors[colors.length - 1]; // return gray for empty/null names
  }
  let hash = 0;
  for (let i = 0; i < locationName.length; i++) {
    hash = locationName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash % (colors.length -1)); // Keep gray as a fallback
  return colors[index];
};

interface LocationTagProps {
  location: string;
}

const LocationTag: React.FC<LocationTagProps> = ({ location }) => {
  const { bgColor, textColor } = getLocationColors(location);
  return (
    <span className={`px-2 py-1 text-xs font-semibold leading-5 rounded-full ${bgColor} ${textColor}`}>
      {location}
    </span>
  );
};

export default LocationTag;
