// Authentication and Session Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isGuest = false;
        this.events = {};
        this.init();
    }

    init() {
        // Load saved session
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.isGuest = localStorage.getItem('isGuest') === 'true';

        // Check token expiration
        if (this.currentUser) {
            if (new Date(this.currentUser.expiryDate) <= new Date()) {
                this.logout();
            }
        }

        // Setup navigation observer
        this.updateNavigationUI();
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser' || e.key === 'isGuest') {
                this.init();
            }
        });
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    updateNavigationUI() {
        const profileLink = document.getElementById('profileLink');
        const loginLink = document.getElementById('loginLink');

        if (profileLink && loginLink) {
            if (this.currentUser) {
                profileLink.style.display = 'flex';
                loginLink.style.display = 'none';
            } else {
                profileLink.style.display = 'none';
                loginLink.style.display = 'flex';
            }
        }
    }

    async login(username, pin) {
        try {
            // Get the correct path for users.json based on current page
            const usersJsonPath = window.location.pathname.includes('/pages/') ? '../users.json' : 'users.json';
            const response = await fetch(usersJsonPath);
            
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }

            const data = await response.json();
            const user = data.users.find(u => 
                u.username === username && 
                u.pin === pin
            );

            if (!user) {
                return { 
                    success: false, 
                    error: 'Invalid username or PIN' 
                };
            }

            if (user.status !== 'active') {
                return { 
                    success: false, 
                    error: 'Account is not active' 
                };
            }

            if (new Date(user.expiryDate) <= new Date()) {
                return { 
                    success: false, 
                    error: 'Subscription has expired' 
                };
            }

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.removeItem('isGuest');
            this.updateNavigationUI();
            this.emit('login', { username: user.username });
            return { success: true };
            
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: 'An error occurred during login. Please try again.' 
            };
        }
    }

    setGuest() {
        this.currentUser = null;
        this.isGuest = true;
        localStorage.setItem('isGuest', 'true');
        localStorage.removeItem('currentUser');
        this.updateNavigationUI();
        this.emit('guest');
    }

    logout() {
        const wasLoggedIn = !!this.currentUser;
        this.currentUser = null;
        this.isGuest = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isGuest');
        this.updateNavigationUI();
        if (wasLoggedIn) {
            this.emit('logout');
        }
    }

    checkAccess(comic) {
        if (!comic.locked) return true;
        if (this.isGuest) return false;
        if (!this.currentUser) return false;
        return this.currentUser.status === 'active' && 
               new Date(this.currentUser.expiryDate) > new Date();
    }

    async updateProfile(userData) {
        try {
            // In a real app, this would be an API call
            // For demo, we'll update localStorage
            if (this.currentUser?.username === userData.username) {
                this.currentUser = { ...this.currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return { success: true };
            }
            return { success: false, error: 'User not found' };
        } catch (error) {
            console.error('Update profile error:', error);
            return { 
                success: false, 
                error: 'Failed to update profile' 
            };
        }
    }

    getProfileData() {
        if (this.currentUser) {
            const isExpired = new Date(this.currentUser.expiryDate) <= new Date();
            return {
                username: this.currentUser.username,
                subscriptionType: this.currentUser.subscriptionType,
                status: this.currentUser.status,
                expiryDate: this.currentUser.expiryDate,
                isExpired
            };
        }
        
        if (this.isGuest) {
            return {
                username: 'Guest User',
                subscriptionType: 'Free',
                status: 'Limited Access',
                expiryDate: null,
                isExpired: false
            };
        }
        
        return null;
    }

    isAuthenticated() {
        return !!this.currentUser && 
               this.currentUser.status === 'active' && 
               new Date(this.currentUser.expiryDate) > new Date();
    }

    redirectIfNotAuthenticated() {
        if (!this.isAuthenticated() && !this.isGuest) {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html')) {
                window.location.href = currentPath.includes('/pages/') ? 
                    'login.html' : 
                    'pages/login.html';
            }
            return true;
        }
        return false;
    }
}