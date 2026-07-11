import React from 'react';

const icons = {
  aries: <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8c0 2.2-1.8 4-4 4s-4-1.8-4-4V4" />,
  taurus: <path d="M4 8c0-4.4 3.6-8 8-8s8 3.6 8 8M12 10a5 5 0 1 0 0 10 5 5 0 1 0 0-10" />,
  gemini: <path d="M8 4v16M16 4v16M4 4h16M4 20h16" />,
  cancer: <path d="M17 12a3 3 0 1 0 0-6 3 3 0 1 0 0 6zm-10 6a3 3 0 1 0 0-6 3 3 0 1 0 0 6zM2 12c4 0 7-3 7-7M22 12c-4 0-7 3-7 7" />,
  leo: <path d="M12 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6zm0 6c-3.3 0-6 2.7-6 6a3 3 0 1 0 6 0" />,
  virgo: <path d="M4 4v10c0 2.2 1.8 4 4 4s4-1.8 4-4V4M12 14c0 2.2 1.8 4 4 4s4-1.8 4-4V4M20 18c0-3.3-2.7-6-6-6" />,
  libra: <path d="M4 16h16M4 10h16M12 10c0-4.4-3.6-8-8-8" />,
  scorpio: <path d="M4 4v10c0 2.2 1.8 4 4 4s4-1.8 4-4V4M12 14c0 2.2 1.8 4 4 4s4-1.8 4-4V4M20 18v-4" />,
  sagittarius: <path d="M4 20l16-16M12 4h8v8M6 14l4 4" />,
  capricorn: <path d="M4 4v10c0 2.2 1.8 4 4 4s4-1.8 4-4V4M12 14c0 2.2 1.8 4 4 4s4-1.8 4-4" />,
  aquarius: <path d="M4 8l4-4 4 4 4-4 4 4M4 16l4-4 4 4 4-4 4 4" />,
  pisces: <path d="M4 4c0 4.4 3.6 8 8 8s8-3.6 8-8M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8M4 12h16" />
};

export default function ZodiacIcon({ name, className = "w-6 h-6", color = "currentColor" }) {
  const icon = icons[name.toLowerCase()];
  
  if (!icon) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icon}
    </svg>
  );
}
