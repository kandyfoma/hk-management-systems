/**
 * Color contrast utilities for accessibility
 * Determines appropriate text colors based on background colors
 */

import { colors } from '../theme/theme';

/**
 * Get appropriate text color based on background color for accessibility
 * @param backgroundColor The background color to check
 * @returns '#FFFFFF' for dark backgrounds, colors.text for light backgrounds
 */
export function getTextColor(backgroundColor: string): string {
  // Light/bright colors that need dark text for proper contrast
  const lightColors = [
    // Theme light colors
    colors.warningLight,    // #FEF3C7 - light yellow
    colors.successLight,    // #E0E7FF - light blue  
    colors.infoLight,       // #E0E7FF - light purple
    colors.errorLight,      // #FEE2E2 - light red
    
    // Common bright colors used in dashboards
    '#10B981',  // Bright green
    '#22C55E',  // Green
    '#FEF3C7',  // Light yellow
    '#E0E7FF',  // Light blue
    '#FEE2E2',  // Light red
    '#F0FDF4',  // Very light green
    '#FEFCE8',  // Very light yellow
    '#DBEAFE',  // Light blue
    '#FDF2F8',  // Light pink
    '#F3E8FF',  // Light purple
  ];
  
  // Warning colors (oranges/yellows) typically need dark text
  if (backgroundColor === colors.warning || backgroundColor === '#F59E0B' || backgroundColor.startsWith('#F')) {
    return colors.text;
  }
  
  // Check if background is in our light colors list
  if (lightColors.includes(backgroundColor)) {
    return colors.text; // Dark text for light backgrounds
  }
  
  // Default to white text for dark/medium backgrounds
  return '#FFFFFF';
}

/**
 * Get appropriate icon background color based on text color
 * @param textColor The text color being used
 * @returns Semi-transparent overlay color for icon backgrounds
 */
export function getIconBackgroundColor(textColor: string): string {
  return textColor === '#FFFFFF' 
    ? 'rgba(255,255,255,0.2)'     // Light overlay for dark backgrounds
    : 'rgba(15,23,42,0.1)';       // Dark overlay for light backgrounds
}

/**
 * Get secondary text color (for subtitles, hints, etc.)
 * @param textColor The primary text color
 * @returns Appropriate secondary text color with reduced opacity
 */
export function getSecondaryTextColor(textColor: string): string {
  return textColor === '#FFFFFF' 
    ? 'rgba(255,255,255,0.9)'     // Slightly transparent white
    : 'rgba(15,23,42,0.8)';       // Slightly transparent dark
}

/**
 * Get tertiary text color (for hints, meta text, etc.)
 * @param textColor The primary text color  
 * @returns Appropriate tertiary text color with more opacity
 */
export function getTertiaryTextColor(textColor: string): string {
  return textColor === '#FFFFFF' 
    ? 'rgba(255,255,255,0.8)'     // More transparent white
    : 'rgba(15,23,42,0.7)';       // More transparent dark
}

/**
 * Get appropriate badge/chip background color
 * @param textColor The primary text color
 * @returns Background color for badges, chips, etc.
 */
export function getBadgeBackgroundColor(textColor: string): string {
  return textColor === '#FFFFFF' 
    ? 'rgba(255,255,255,0.15)'    // Light overlay for dark backgrounds
    : 'rgba(15,23,42,0.1)';       // Dark overlay for light backgrounds
}