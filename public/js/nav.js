// Navigation bar toggle and logout handler
// This script adds mobile menu toggle functionality and a unified logout function.

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (toggleButton && navLinks) {
    toggleButton.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
});

/**
 * 로그아웃 처리.
 * 로컬 스토리지에 저장된 인증 토큰을 제거하고 로그인 페이지로 이동합니다.
 * 파이어베이스 인증을 사용하는 경우 signOut()을 호출합니다.
 */
function logout() {
  try {
    localStorage.removeItem('idToken');
  } catch (e) {
    console.error('Error clearing idToken:', e);
  }
  // If Firebase auth is available, sign out
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      firebase.auth().signOut();
    } catch (err) {
      console.error('Firebase signOut failed:', err);
    }
  }
  // Redirect to login page
  window.location.href = 'login.html';
}