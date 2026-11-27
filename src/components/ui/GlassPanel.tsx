import React from 'react';

export type GlassVariant = 'light' | 'frosted' | 'dense';

interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  variant?: GlassVariant;
  as?: 'div' | 'section' | 'aside' | 'nav' | 'header';
  accentBorder?: boolean;
  grain?: boolean;
  allowOverflow?: boolean;
  children: React.ReactNode;
}

export function GlassPanel({
  variant = 'frosted',
  as = 'div',
  accentBorder = false,
  grain = true,
  allowOverflow = false,
  className = '',
  style,
  children,
  ...rest
}: GlassPanelProps) {
  const Tag = as as React.ElementType;

  return (
    <Tag
      data-glass-panel="true"
      data-glass-variant={variant}
      data-glass-grain={grain ? 'true' : 'false'}
      className={`glass-panel relative ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} ${accentBorder ? 'glass-panel-accent' : ''} ${className}`}
      style={{
        borderRadius: '20px',
        color: 'var(--glass-fg, #FFFDF9)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
