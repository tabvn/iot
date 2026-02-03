"use client";
import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 56, text: 'text-3xl' },
  };

  const iconSize = sizes[size].icon;
  const textSize = sizes[size].text;

  // Minimalist Modern BC Logo - Flat, Clean, Simple
  const IconLogo = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* Simple rounded square background */}
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="18"
        fill="url(#bcGradient)"
      />

      {/* BC Text - Clean sans-serif */}
      <text
        x="50"
        y="68"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        BC
      </text>
    </svg>
  );

  if (variant === 'icon') {
    return <IconLogo />;
  }

  // Full Logo with text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconLogo />
      <div className="flex flex-col">
        <span className={`font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent ${textSize} leading-tight`}>
          Thebaycity
        </span>
        <span className="text-xs text-gray-500 -mt-1">IoT Platform</span>
      </div>
    </div>
  );
}

// Simplified version for small spaces
export function MinimalLogo({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="minimalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="18"
        fill="url(#minimalGrad)"
      />

      <text
        x="50"
        y="68"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        BC
      </text>
    </svg>
  );
}

// Animated version for loading states
export function AnimatedLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="animGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb">
            <animate
              attributeName="stop-color"
              values="#2563eb; #7c3aed; #2563eb"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#7c3aed">
            <animate
              attributeName="stop-color"
              values="#7c3aed; #2563eb; #7c3aed"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="18"
        fill="url(#animGrad)"
      />

      <text
        x="50"
        y="68"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        BC
      </text>
    </svg>
  );
}

// Favicon version (32x32)
export function FaviconLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="18"
        fill="url(#favGrad)"
      />

      <text
        x="50"
        y="68"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        BC
      </text>
    </svg>
  );
}
