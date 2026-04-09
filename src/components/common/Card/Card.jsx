import './Card.css';

export function Card({
    children,
    variant = 'default',
    hoverable = false,
    selected = false,
    onClick,
    className = '',
    ...props
}) {
    const classes = [
        'card',
        `card--${variant}`,
        hoverable && 'card--hoverable',
        selected && 'card--selected',
        onClick && 'card--clickable',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} onClick={onClick} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return <div className={`card__header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
    return <div className={`card__body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
    return <div className={`card__footer ${className}`}>{children}</div>;
}

export default Card;
