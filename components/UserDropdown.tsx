import React from 'react';
import { useHistory } from 'react-router-dom';

const UserDropdown: React.FC = () => {
    const history = useHistory();

    const handleLogout = () => {
        // Add your logout functionality here
        // For example, clearing tokens and redirecting to the login page
        localStorage.removeItem('token');
        history.push('/login');
    };

    return (
        <div className="user-dropdown">
            <button className="user-dropdown-button">
                User Name {/* Replace with actual user name */}
            </button>
            <div className="user-dropdown-content">
                <a href="/profile">Profile</a>
                <a href="#" onClick={handleLogout}>Logout</a>
            </div>
        </div>
    );
};

export default UserDropdown;