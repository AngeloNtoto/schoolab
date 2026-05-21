import { OPTIONS } from '../../constants/school';

/**
 * Generate display name for a class based on level, option, and section
 * @param level - Class level (e.g., "7ème", "1ère")
 * @param option - Class option code (e.g., "EB", "ELECTRONIQUE")
 * @param section - Class section (e.g., "A", "B", "-" for no section)
 * @returns Formatted class name
 */
export function getClassDisplayName(
  level: string,
  option: string,
  section: string
): string {
  const optionObj = OPTIONS.find((o) => o.value === option);
  const optionPart = option !== 'EB' && optionObj ? ` ${optionObj.label}` : '';
  const sectionPart = section && section !== '-' ? ` ${section}` : '';
  return `${level}${optionPart}${sectionPart}`;
}
