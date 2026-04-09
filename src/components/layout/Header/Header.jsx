import { useTranslation } from 'react-i18next';
import useTheme from '../../../hooks/useTheme';
import './Header.css';

export function Header() {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'tr' ? 'en' : 'tr';
        i18n.changeLanguage(newLang);
    };

    return (
        <header className="header">
            <div className="header__container">
                <a href="/" className="header__logo">
                    <span className="header__logo-icon">⚽</span>
                    <span className="header__logo-text">{t('common.appName')}</span>
                </a>

                <div className="header__actions">
                    {/* Language Toggle */}
                    <button
                        className="header__toggle"
                        onClick={toggleLanguage}
                        aria-label={t('common.language')}
                        title={t('common.language')}
                    >
                        <span className="header__toggle-icon">
                            {i18n.language === 'tr' ? '🇹🇷' : '🇬🇧'}
                        </span>
                        <span className="header__toggle-text">
                            {i18n.language === 'tr' ? 'TR' : 'EN'}
                        </span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                        className="header__toggle"
                        onClick={toggleTheme}
                        aria-label={t('common.theme')}
                        title={t('common.theme')}
                    >
                        <span className="header__toggle-icon">
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;
