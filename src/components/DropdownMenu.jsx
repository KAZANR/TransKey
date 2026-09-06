import { CheckTick } from '../icons';
import { twMerge } from 'tailwind-merge';

export default function DropdownMenu({
    show,
    onClose,
    options,
    currentValue,
    onSelect,
    placement = 'top',
    anchorPosition = 'left-0',
    className = '',
    renderOption,
}) {
    return show && (
        <>
            <div
                className="fixed inset-0 z-10"
                onClick={onClose}
            />
            <div
                className={twMerge(
                    `absolute z-20 min-w-[150px] rounded-xl bg-[var(--md-surface-container)] py-2 shadow-[0_4px_16px_rgba(0,0,0,0.16)] ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${anchorPosition}`,
                    className
                )}
            >
                {Object.entries(options).map(([value, label]) => {
                    const isActive = value === currentValue;
                    return (
                        <button
                            key={value}
                            className={twMerge(
                                'flex w-full items-center px-3.5 py-2 text-sm transition-colors',
                                isActive
                                    ? 'font-semibold text-[var(--md-primary)]'
                                    : 'text-[var(--md-on-surface)] hover:bg-[color-mix(in_srgb,var(--md-on-surface)_8%,transparent)]'
                            )}
                            onClick={() => onSelect(value)}
                        >
                            {renderOption ? renderOption(value, label) : label}
                            {isActive && (
                                <CheckTick className="ml-auto w-4 h-4 stroke-[var(--md-primary)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
