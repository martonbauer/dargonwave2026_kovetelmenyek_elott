// Landing Page Logic

// Scroll Effect for Navbar
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Modal Toggle
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Login Logic
async function performLogin() {
    const password = document.getElementById('adminPasswordInput').value;
    
    // Using the same API as the management app
    const API_URL = window.DRAGONWAVE_API_URL || 'http://localhost:3001/api';
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            localStorage.setItem('dragonAdminPassword', password);
            window.location.href = 'management.html?view=admin';
        } else {
            alert('Hibás jelszó!');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Hiba a szerver kapcsolatban!');
    }
}

// Smooth scroll internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

