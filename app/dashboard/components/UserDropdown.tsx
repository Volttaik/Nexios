import React from 'react';
import { useHistory } from 'react-router-dom';

const UserDropdown = () => {
  const history = useHistory();

  const handleLogout = () => {
    // Perform logout logic here (e.g., clearing tokens, updating state)
    console.log('User logged out');
    history.push('/login'); // Redirect to login page after logout
  };

  return (
    <div className="user-dropdown">
      <button onClick={() => alert('Profile clicked')}>Profile</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default UserDropdown;