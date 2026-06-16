/**
 * Joe Builds Home Intelligence Platform
 * Auth Controller (Memberstack SDK Integration & Supabase Profile Mapping)
 */
const JoeBuildsAuth = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlmaXdrYnV2dWFqd3piamhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzY0MDEsImV4cCI6MjA5NzIxMjQwMX0.F315XwWSxPHEoCjQ14VDfpLBSbH9poN94fMyBGXUehE';
  let supabase;

  const DOM = {
    allForms: document.querySelectorAll('.jb-interactive-form'),
    navLinks: document.querySelectorAll('.jb-nav-link'),
    loginForm: document.getElementById('jbLoginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLoginSubmit: document.getElementById('btnLoginSubmit'),
    loginError: document.getElementById('loginError'),
    signUpForm: document.getElementById('jbSignUpForm'),
    signUpUser: document.getElementById('signUpUser'),
    signUpEmail: document.getElementById('signUpEmail'),
    signUpPassword: document.getElementById('signUpPassword'),
    btnSignUpSubmit: document.getElementById('btnSignUpSubmit'),
    signUpError: document.getElementById('signUpError'),
    forgotForm: document.getElementById('jbForgotForm'),
    forgotEmail: document.getElementById('forgotEmail'),
    btnForgotSubmit: document.getElementById('btnForgotSubmit'),
    forgotError: document.getElementById('forgotError')
  };

  const initRouter = () => {
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const targetFormId = link.getAttribute('data-target');
        DOM.allForms.forEach(form => form.classList.add('jb-hidden'));
        DOM.loginError.classList.add('jb-hidden');
        DOM.signUpError.classList.add('jb-hidden');
        DOM.forgotError.classList.add('jb-hidden');
        const targetForm = document.getElementById(targetFormId);
        if (targetForm) targetForm.classList.remove('jb-hidden');
      });
    });
  };

  const initAuthHandlers = () => {
    if (DOM.loginForm) {
      DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.loginError.classList.add('jb-hidden');
        DOM.btnLoginSubmit.disabled = true;
        DOM.btnLoginSubmit.innerHTML = `Authenticating...`;
        try {
          await window.$memberstackDom.loginMember({ email: DOM.loginEmail.value, password: DOM.loginPassword.value });
          window.location.href = '/dashboard';
        } catch (err) {
          DOM.loginError.textContent = err.message || "Invalid credentials.";
          DOM.loginError.classList.remove('jb-hidden');
          DOM.btnLoginSubmit.disabled = false;
          DOM.btnLoginSubmit.innerHTML = `Enter Portal`;
        }
      });
    }

    if (DOM.signUpForm) {
      DOM.signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.signUpError.classList.add('jb-hidden');
        DOM.btnSignUpSubmit.disabled = true;
        DOM.btnSignUpSubmit.innerHTML = `Registering...`;
        try {
          const member = await window.$memberstackDom.signupMember({
            email: DOM.signUpEmail.value, 
            password: DOM.signUpPassword.value,
            customFields: { first_name: DOM.signUpUser.value }
          });
          if (member.data && member.data.id) {
            await supabase.from('profiles').insert([{ memberstack_id: member.data.id, role: 'client' }]);
          }
          window.location.href = '/dashboard';
        } catch (err) {
          DOM.signUpError.textContent = err.message || "Registration failed.";
          DOM.signUpError.classList.remove('jb-hidden');
          DOM.btnSignUpSubmit.disabled = false;
          DOM.btnSignUpSubmit.innerHTML = `Create Account`;
        }
      });
    }

    if (DOM.forgotForm) {
      DOM.forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.forgotError.classList.add('jb-hidden');
        DOM.btnForgotSubmit.disabled = true;
        DOM.btnForgotSubmit.innerHTML = `Sending...`;
        try {
          await window.$memberstackDom.sendResetPasswordEmail({ email: DOM.forgotEmail.value });
          DOM.forgotError.style.color = '#3A6B48';
          DOM.forgotError.textContent = "Recovery link sent to your email inbox.";
          DOM.forgotError.classList.remove('jb-hidden');
          DOM.btnForgotSubmit.innerHTML = `Link Sent`;
        } catch (err) {
          DOM.forgotError.style.color = 'var(--status-review)';
          DOM.forgotError.textContent = err.message || "Failed to send reset email.";
          DOM.forgotError.classList.remove('jb-hidden');
          DOM.btnForgotSubmit.disabled = false;
          DOM.btnForgotSubmit.innerHTML = `Send Reset Code`;
        }
      });
    }
  };

  const init = async () => {
    initRouter();
    initAuthHandlers();
    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const member = await window.$memberstackDom.getCurrentMember();
      if (member && member.data) window.location.href = '/dashboard';
    } catch (e) {}
  };
  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', JoeBuildsAuth.init);
} else { JoeBuildsAuth.init(); }
