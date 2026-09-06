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
                    `absolute z-20 min-w-[150px] p-1.5 rounded-xl bg-white border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${anchorPosition}`,
                    className
                )}
            >
                {Object.entries(options).map(([value, label]) => {
                    const isActive = value === currentValue;
                    return (
                        <button
                            key={value}
                            className={twMerge(
                                'w-full flex items-center px-3 py-2 text-[14px] rounded-lg',
                                isActive
                                    ? 'text-zinc-900 font-semibold bg-zinc-100'
                                    : 'text-zinc-700 hover:bg-zinc-100'
                            )}
                            onClick={() => onSelect(value)}
                        >
                            {renderOption ? renderOption(value, label) : label}
                            {isActive && (
                                <CheckTick className="w-5 h-5 ml-auto stroke-zinc-900" />
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
