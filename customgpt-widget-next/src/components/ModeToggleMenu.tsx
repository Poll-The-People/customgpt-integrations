'use client';

/**
 * ModeToggleMenu Component - Toggle between particle and avatar modes
 */

import React, { useEffect, useRef } from 'react';
import { DisplayMode, ModeToggleMenuProps } from '@/types/avatar';
import './ModeToggleMenu.css';

export const ModeToggleMenu: React.FC<ModeToggleMenuProps> = ({
  currentMode,
  onModeChange,
  show,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!show) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  const handleModeSelect = (mode: DisplayMode) => {
    onModeChange(mode);
    onClose();
  };

  if (!show) return null;

  return (
    <div
      ref={menuRef}
      className="mode-toggle-menu"
      role="menu"
      aria-label="Display mode selection"
    >
      <button
        className={`mode-menu-item ${currentMode === DisplayMode.PARTICLES ? 'active' : ''}`}
        onClick={() => handleModeSelect(DisplayMode.PARTICLES)}
        role="menuitem"
        aria-label="Switch to particle animation mode"
      >
        <span className="mode-icon">🎵</span>
        <span className="mode-label">Particle Animation</span>
        {currentMode === DisplayMode.PARTICLES && (
          <span className="mode-checkmark">✓</span>
        )}
      </button>

      <button
        className={`mode-menu-item ${currentMode === DisplayMode.AVATAR ? 'active' : ''}`}
        onClick={() => handleModeSelect(DisplayMode.AVATAR)}
        role="menuitem"
        aria-label="Switch to avatar mode"
      >
        <span className="mode-icon">👤</span>
        <span className="mode-label">Avatar Mode</span>
        {currentMode === DisplayMode.AVATAR && (
          <span className="mode-checkmark">✓</span>
        )}
      </button>
    </div>
  );
};
