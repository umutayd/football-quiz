import './ProgressBar.css';

export function ProgressBar({
    value = 0,
    max = 100,
    variant = 'primary',
    size = 'medium',
    showLabel = false,
    animated = true,
    className = ''
}) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const classes = [
        'progress',
        `progress--${variant}`,
        `progress--${size}`,
        animated && 'progress--animated',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <div className="progress__track">
                <div
                    className="progress__fill"
                    style={{ '--progress-width': `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="progress__label">{Math.round(percentage)}%</span>
            )}
        </div>
    );
}

export default ProgressBar;
