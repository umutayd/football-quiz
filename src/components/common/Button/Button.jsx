import './Button.css';

export function Button({
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    onClick,
    ...props
}) {
    const classes = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full',
        loading && 'btn--loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <span className="btn__spinner" />}
            {icon && iconPosition === 'left' && !loading && (
                <span className="btn__icon btn__icon--left">{icon}</span>
            )}
            <span className="btn__text">{children}</span>
            {icon && iconPosition === 'right' && !loading && (
                <span className="btn__icon btn__icon--right">{icon}</span>
            )}
        </button>
    );
}

export default Button;
