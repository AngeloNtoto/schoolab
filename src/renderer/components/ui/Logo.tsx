import React from 'react';
import LogoIconImg from '../../assets/logo-icon.png';
import LogoFullImg from '../../assets/logo-full.png';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'color';
}

/**
 * Le symbole "S" stylisé de Schoolab
 */
export const LogoIcon: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
  return (
    <img 
      src={LogoIconImg} 
      alt="Schoolab Icon" 
      width={size} 
      height={size} 
      className={`${className} object-contain`} 
      style={{ width: size, height: size }}
    />
  );
};

// Version simplifiée (identique à l'icône pour l'instant avec le nouveau design)
export const SchoolabSymbol: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
    return (
        <img 
          src={LogoIconImg} 
          alt="Schoolab Symbol" 
          width={size} 
          height={size} 
          className={`${className} object-contain`} 
          style={{ width: size, height: size }}
        />
    )
}

/**
 * Logo Complet avec Texte
 */
export const LogoFull: React.FC<LogoProps> = ({ className = '', size = 32, variant = 'color' }) => {
  // Calcul de la largeur proportionnelle (ratio ~3.7)
  const width = size * 3.7;
  
  // Si on veut juste l'image complète
  return (
    <img 
      src={LogoFullImg} 
      alt="Schoolab" 
      height={size} 
      className={`${className} object-contain`} 
      style={{ height: size, width: 'auto' }}
    />
  );
};

export default LogoFull;
