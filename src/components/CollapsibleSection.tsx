import { ReactNode, useState } from 'react';
import MaterialIcon from './MaterialIcon';

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  defaultExpanded?: boolean;
  gradient?: boolean;
  titleRight?: ReactNode;
  headerAction?: ReactNode | ((context: { isExpanded: boolean; showGradient: boolean }) => ReactNode);
  onExpandedChange?: (isExpanded: boolean) => void;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultExpanded = false,
  gradient = false,
  titleRight,
  headerAction,
  onExpandedChange,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const showGradient = gradient && isExpanded;

  const baseClasses = showGradient
    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
    : 'bg-white dark:bg-gray-800 shadow-sm';
  const renderedHeaderAction = typeof headerAction === 'function' ? headerAction({ isExpanded, showGradient }) : headerAction;
  const toggleExpanded = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <div className={`${baseClasses} rounded-2xl overflow-hidden transition-all duration-300`}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleExpanded}
          className="min-w-0 flex-1 p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <MaterialIcon name={icon} className="text-[24px] shrink-0" />
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <h2 className={`font-semibold text-lg ${showGradient ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                {title}
              </h2>
              {titleRight ? (
                <div className={`ml-auto text-xs font-medium whitespace-nowrap ${showGradient ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'}`}>
                  {titleRight}
                </div>
              ) : null}
            </div>
          </div>
          {renderedHeaderAction ? (
            <div className="shrink-0 ml-3 mr-4" onClick={(event) => event.stopPropagation()}>
              {renderedHeaderAction}
            </div>
          ) : null}
          <span className={`text-xl transition-transform duration-300 ${showGradient ? 'text-white' : 'text-gray-400'} ${isExpanded ? 'rotate-180' : ''}`}>
            <MaterialIcon name="expand_more" className="text-[24px]" />
          </span>
        </button>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
