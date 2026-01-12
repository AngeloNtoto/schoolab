import React from 'react';
import Image from 'next/image';

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
  
  return (
    <div className={`relative ${className} ${filterClass}`} style={{ width: size, height: size }}>
      <Image 
        src="/icons/logo_symbol.png" 
        alt="Schoolab Icon" 
        fill
        className="object-contain"
        sizes={`${size}px`}
      />
    </div>
  );
};

export const SchoolabSymbol = LogoIcon;

interface AppIconProps {
    className?: string;
    size?: number;
    bg?: 'white' | 'blue';
}

export const AppIcon: React.FC<AppIconProps> = ({ className = '', size = 32, bg = 'white' }) => {
    return (
        <div className={`relative ${className} rounded-xl shadow-sm overflow-hidden`} style={{ width: size, height: size }}>
            <Image 
                src={bg === 'white' ? "/icons/icon_square_white.png" : "/icons/icon_square_blue.png"} 
                alt="Schoolab App Icon" 
                fill
                className="object-contain"
                sizes={`${size}px`}
            />
        </div>
    )
}

/**
 * Logo Complet avec Texte
 */
export const LogoFull: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
  const isLight = variant === 'light';
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
        <div className={`relative ${isLight ? 'brightness-0 invert' : ''}`} style={{ width: size, height: size }}>
             <Image 
                src="/icons/logo_symbol.png" 
                alt="Schoolab" 
                fill
                className="object-contain"
                sizes={`${size}px`}
            />
        </div>
        <div className="flex flex-col">
            <span className={`font-black tracking-tighter leading-none ${isLight ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: size * 0.8 }}>
                SCHOOLAB
            </span>
            {size > 20 && (
                <span className={`uppercase tracking-[0.3em] font-bold ${isLight ? 'text-blue-200' : 'text-blue-600'}`} style={{ fontSize: size * 0.35, marginLeft: 2 }}>
                    CLOUD
                </span>
            )}
        </div>
    </div>
  );
};

export default LogoFull;
