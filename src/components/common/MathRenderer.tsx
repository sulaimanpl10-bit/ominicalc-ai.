import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  latex,
  displayMode = true,
  className = '',
}) => {
  const html = useMemo(() => {
    if (!latex || typeof latex !== 'string') return null;
    try {
      let clean = latex.trim();
      // Remove enclosing $ or $$ if present
      if (clean.startsWith('$$') && clean.endsWith('$$')) {
        clean = clean.slice(2, -2).trim();
      } else if (clean.startsWith('$') && clean.endsWith('$')) {
        clean = clean.slice(1, -1).trim();
      }
      // Clean up common markdown math wrappers
      clean = clean.replace(/\\\[/g, '').replace(/\\\]/g, '');
      return katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return <span className={`font-mono text-sm ${className}`}>{latex}</span>;
  }

  return (
    <span
      className={`overflow-x-auto max-w-full inline-block align-middle ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
