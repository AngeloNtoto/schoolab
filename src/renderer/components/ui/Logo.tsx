import React from 'react';
import IconBgBlue from '../../assets/icons/icon_background_blue.png';
import IconBgWhite from '../../assets/icons/icon_background_white.png';
import IconSansBg from '../../assets/icons/icon_sans_background.png';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'color';
}

/**
 * Le symbole "S" stylisé de Schoolab
 */
export const LogoIcon: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
  const filterClass = variant === 'light' ? 'brightness-0 invert' : '';
  // Default to sans background for maximum versatility
  const src = IconSansBg; 
  
  return (
    <img 
      src={src} 
      alt="Schoolab Icon" 
      width={size} 
      height={size} 
      className={`${className} ${filterClass} object-contain`} 
      style={{ width: size, height: size }}
    />
  );
};

// Version simplifiée (identique à l'icône pour l'instant avec le nouveau design)
export const SchoolabSymbol: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
    const filterClass = variant === 'light' ? 'brightness-0 invert' : '';

    return (
        <img 
          src={IconSansBg} 
          alt="Schoolab Symbol" 
          width={size} 
          height={size} 
          className={`${className} ${filterClass} object-contain`} 
          style={{ width: size, height: size }}
        />
    )
}

interface AppIconProps {
    className?: string;
    size?: number;
    bg?: 'white' | 'blue';
}

export const AppIcon: React.FC<AppIconProps> = ({ className = '', size = 32, bg = 'white' }) => {
    return (
        <img 
          src={bg === 'white' ? IconBgWhite : IconBgBlue} 
          alt="Schoolab App Icon" 
          width={size} 
          height={size} 
          className={`${className} rounded-xl shadow-sm`} 
          style={{ width: size, height: size }}
        />
    )
}

/**
 * Logo Complet avec Texte
 */
export const LogoFull: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
  // Variant 'light' is for dark backgrounds (white text)
  // Variant 'dark' is for light backgrounds (dark text)
  // Variant 'color' is default (usually dark text)

  const isLight = variant === 'light';
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
        <img 
            src={IconSansBg} 
            alt="Schoolab" 
            height={size} 
            width={size}
            className={`object-contain ${isLight ? 'brightness-0 invert' : ''}`}
            style={{ height: size, width: size }}
        />
        <div className="flex flex-col">
            <span className={`font-black tracking-tighter leading-none ${isLight ? 'text-white' : 'text-slate-900 dark:text-white'}`} style={{ fontSize: size * 0.8 }}>
                SCHOOLAB
            </span>
            {size > 20 && (
                <span className={`uppercase tracking-[0.3em] font-bold ${isLight ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`} style={{ fontSize: size * 0.35, marginLeft: 2 }}>
                    MANAGER
                </span>
            )}
        </div>
    </div>
  );
};

export default LogoFull;
