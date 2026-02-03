import { SVGProps } from 'react';

export function PineappleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Pineapple body - oval shape */}
      <ellipse cx="12" cy="15" rx="5.5" ry="7" fill="currentColor" opacity="0.15" />
      <ellipse cx="12" cy="15" rx="5.5" ry="7" stroke="currentColor" />
      
      {/* Pineapple diamond pattern */}
      <path d="M12 10 L12 20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 13 L16 13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 15.5 L15 15.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 18 L14 18" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Diagonal pattern lines */}
      <path d="M9 12 L15 18" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M15 12 L9 18" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      
      {/* Pineapple crown/leaves at top */}
      <path d="M10 7 L12 3 L14 7" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 6.5 L10 5.5 L9 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M14 6.5 L16 5.5 L15 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M6 8 L8 7 L7 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M16 8 L18 7 L17 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

