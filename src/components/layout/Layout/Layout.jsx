import Header from '../Header';
import './Layout.css';

export function Layout({ children, showHeader = true }) {
    return (
        <div className="layout">
            {showHeader && <Header />}
            <main className="layout__main">
                {children}
            </main>
        </div>
    );
}

export default Layout;
