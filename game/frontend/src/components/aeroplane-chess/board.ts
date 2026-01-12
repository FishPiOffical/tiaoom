export type AeroplaneColor = 'y' | 'b' | 'r' | 'g';

export const GRID_SIZE = 17;

export const COLORS: AeroplaneColor[] = ['y', 'b', 'r', 'g'];

export function getBgColor(color: AeroplaneColor, opacity=false) {
  switch (color) {
    case 'y':
      return opacity ? 'bg-warning/20' : 'bg-warning';
    case 'b':
      return opacity ? 'bg-info/20' : 'bg-info';
    case 'r':
      return opacity ? 'bg-error/20' : 'bg-error';
    case 'g':
      return opacity ? 'bg-success/20' : 'bg-success';
  }
}

export function getTextColor(color: AeroplaneColor, content=true) {
  switch (color) {
    case 'y':
      return content ? 'text-warning-content' : 'text-warning';
    case 'b':
      return content ? 'text-info-content' : 'text-info';
    case 'r':
      return content ? 'text-error-content' : 'text-error';
    case 'g':
      return content ? 'text-success-content' : 'text-success';
  }
}

export function getBorderColor(color: AeroplaneColor) {
  switch (color) {
    case 'y':
      return 'border-warning';
    case 'b':
      return 'border-info';
    case 'r':
      return 'border-error';
    case 'g':
      return 'border-success';
  }
}

export function getBadgeColor(color: AeroplaneColor) {
  switch (color) {
    case 'y':
      return 'badge-warning';
    case 'b':
      return 'badge-info';
    case 'r':
      return 'badge-error';
    case 'g':
      return 'badge-success';
  }
}