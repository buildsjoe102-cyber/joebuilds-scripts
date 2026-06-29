/**
 * Joe Builds Home Intelligence Platform
 * Auth Controller (v4 - Custom JWT Polling & Publishable Key)
 */
const JoeBuildsAuth = (() => {
  const SUPABASE_URL = 'https://jsqyfiwkbuvuajwzbjhd.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_xla-awjgU2npKzrWHdYKDQ_2ox0CWmC';
  let supabase;

  const DOM = {
    allForms: document.querySelectorAll('.jb-interactive-form'),
    navLinks: document.querySelectorAll('.jb-nav-link'),
    
    // Login Elements
    loginForm: document.getElementById('jbLoginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLoginSubmit: document.getElementById('btnLoginSubmit'),
    loginError: document.getElementById('loginError'),

    // Signup Elements
    signUpForm: document.getElementById('jbSignUpForm'),
    signUpUser: document.getElementById('signUpUser'),
    signUpEmail: document.getElementById('signUpEmail'),
    signUpPassword: document.getElementById('signUpPassword'),
    btnSignUpSubmit: document.getElementById('btnSignUpSubmit'),
    signUpError: document.getElementById('signUpError'),

    // Forgot Elements
    forgotForm: document.getElementById('jbForgotForm'),
    forgotEmail: document.getElementById('forgotEmail'),
    btnForgotSubmit: document.getElementById('btnForgotSubmit'),
    forgotError: document.getElementById('forgotError'),
    
    // Password Toggles
    passwordToggles: document.querySelectorAll('.jb-password-toggle')
  };

  /**
   * 1. Interactive Form State Router & UI Events
   */
  const initRouter = () => {
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const targetFormId = link.getAttribute('data-target');
        
        DOM.allForms.forEach(form => form.classList.add('jb-hidden'));
        DOM.loginError.classList.add('jb-hidden');
        DOM.signUpError.classList.add('jb-hidden');
        DOM.forgotError.classList.add('jb-hidden');

        const targetForm = document.getElementById(targetFormId);
        if (targetForm) {
          targetForm.classList.remove('jb-hidden');
        }
      });
    });

    // Setup Password Hide/Show Toggles
    DOM.passwordToggles.forEach(toggleBtn => {
      toggleBtn.addEventListener('click', () => {
        const input = toggleBtn.previousElementSibling;
        const svgUse = toggleBtn.querySelector('use');
        
        if (input.type === 'password') {
          input.type = 'text';
          svgUse.setAttribute('href', '#eye-off-icon');
        } else {
          input.type = 'password';
          svgUse.setAttribute('href', '#eye-icon');
        }
      });
    });
  };

  /**
   * 2. Form Submissions to Memberstack
   */
  const initAuthHandlers = () => {
    
    if (DOM.loginForm) {
      DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.loginError.classList.add('jb-hidden');
        DOM.btnLoginSubmit.disabled = true;
        DOM.btnLoginSubmit.innerHTML = `Authenticating...`;

        try {
          const email = DOM.loginEmail.value;
          const password = DOM.loginPassword.value;
          
          await window.$memberstackDom.loginMemberEmailPassword({ email, password });
          window.location.href = '/dashboard';
        } catch (err) {
          DOM.loginError.textContent = err.message || "Invalid credentials.";
          DOM.loginError.classList.remove('jb-hidden');
          DOM.btnLoginSubmit.disabled = false;
          DOM.btnLoginSubmit.innerHTML = `Enter Portal <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="jb-action-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
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
          const email = DOM.signUpEmail.value;
          const password = DOM.signUpPassword.value;
          const name = DOM.signUpUser.value;

          const member = await window.$memberstackDom.signupMemberEmailPassword({
            email, 
            password,
            customFields: { "first-name": name } 
          });

          if (member.data && member.data.id) {
            // 1. Insert Profile into Supabase
            await supabase.from('profiles').insert([{
              memberstack_id: member.data.id,
              role: 'client' 
            }]);

            // 2. Poll Memberstack to wait for Edge Function to write the JWT
            DOM.btnSignUpSubmit.innerHTML = `Provisioning Security...`;
            for(let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1000));
                const check = await window.$memberstackDom.getCurrentMember();
                if(check.data && check.data.customFields && check.data.customFields['supabase-jwt']) {
                    break; // Edge function finished!
                }
            }
          }

          window.location.href = '/dashboard';
        } catch (err) {
          DOM.signUpError.textContent = err.message || "Registration failed.";
          DOM.signUpError.classList.remove('jb-hidden');
          DOM.btnSignUpSubmit.disabled = false;
          DOM.btnSignUpSubmit.innerHTML = `Create Account <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="jb-action-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
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
          const email = DOM.forgotEmail.value;
          await window.$memberstackDom.sendMemberResetPasswordEmail({ email });
          
          DOM.forgotError.style.color = '#3A6B48'; 
          DOM.forgotError.textContent = "Recovery link sent to your email inbox.";
          DOM.forgotError.classList.remove('jb-hidden');
          DOM.btnForgotSubmit.innerHTML = `Link Sent`;
        } catch (err) {
          DOM.forgotError.style.color = 'var(--status-review)';
          DOM.forgotError.textContent = err.message || "Failed to send reset email.";
          DOM.forgotError.classList.remove('jb-hidden');
          DOM.btnForgotSubmit.disabled = false;
          DOM.btnForgotSubmit.innerHTML = `Send Reset Code <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="jb-action-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
        }
      });
    }
  };

  /**
   * 3. Initialization
   */
  const init = async () => {
    initRouter();
    initAuthHandlers();

    if (!window.supabase) return;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
      const member = await window.$memberstackDom.getCurrentMember();
      if (member && member.data) {
        window.location.href = '/dashboard';
      }
    } catch (e) {}
  };

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', JoeBuildsAuth.init);
} else {
  JoeBuildsAuth.init();
}
