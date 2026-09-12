import * as React from 'react';
import { cn } from '../../lib/utils';

/* MIUI/iOS 风格开关 */
const Switch = React.forwardRef(({ className, checked, onCheckedChange, disabled }, ref) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-primary' : 'bg-muted-foreground/30',
            className
        )}
    >
        <span
            className={cn(
                'pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform',
                checked ? 'translate-x-[22px]' : 'translate-x-0.5'
            )}
        />
    </button>
));
Switch.displayName = 'Switch';

export { Switch };
