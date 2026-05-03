// RSVP form → Google Apps Script Web App.

const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzVsUxmuLkiET9VhHc317wYslYaBuRw_Xsa45UI1Q-9HudgDsr0Tp-4uJdrH906NhuJ/exec';

const form   = document.getElementById('rsvp-form');
const status = form.querySelector('.form-status');
const submit = form.querySelector('.form-submit');

/* Inline validation messages. Native browser tooltips (`reportValidity()`)
   are unreliable on mobile — Safari often shows nothing at all and Chrome
   for Android only flashes a tiny bubble — so we render the error inside
   the form instead. */

const showFieldError = (field, message) => {
  const wrap = field.closest('.form-field');
  if (!wrap) return;
  let err = wrap.querySelector('.form-field__error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-field__error';
    wrap.appendChild(err);
  }
  err.textContent = message;
  wrap.classList.add('form-field--invalid');
};

const clearFieldError = (field) => {
  const wrap = field?.closest('.form-field');
  if (!wrap) return;
  wrap.querySelector('.form-field__error')?.remove();
  wrap.classList.remove('form-field--invalid');
};

/* Conditional block: ubytování, oběd a stravovací omezení dávají smysl
   jen pokud host potvrdí účast. Když host vybere "Ne" (nebo zatím nic),
   pole musí být skrytá i nevalidovaná — `required` na hidden inputu by
   jinak zablokoval odeslání formuláře. */
const conditional = form.querySelector('[data-rsvp-conditional]');
const conditionalRequired = Array.from(
  conditional.querySelectorAll('[required]')
);

const setConditionalVisible = (visible) => {
  conditional.hidden = !visible;
  conditionalRequired.forEach((el) => {
    if (visible) {
      el.setAttribute('required', '');
    } else {
      el.removeAttribute('required');
      clearFieldError(el);
    }
  });
  if (!visible) {
    conditional.querySelectorAll('input[type="radio"]')
      .forEach((r) => { r.checked = false; });
    conditional.querySelectorAll('textarea')
      .forEach((t) => { t.value = ''; });
  }
};

setConditionalVisible(false);

form.querySelectorAll('input[type="radio"][name="ucast"]').forEach((r) => {
  r.addEventListener('change', () => {
    setConditionalVisible(r.checked && r.value === 'ano');
  });
});

const clearFormStatus = () => {
  status.className = 'form-status';
  status.textContent = '';
};

/* Clear the inline error as soon as the user fixes the field. Pokud se
   pod submitem zobrazila chybová hláška, taky ji uklidíme — ať uživatel
   ví, že jeho oprava registrujeme. */
form.querySelectorAll('input, textarea').forEach((el) => {
  const handler = () => {
    if (el.type === 'radio') {
      if (form.querySelector(`input[name="${el.name}"]:checked`)) {
        clearFieldError(el);
      }
    } else if (el.value.trim()) {
      clearFieldError(el);
    }
    if (status.classList.contains('form-status--error')) {
      clearFormStatus();
    }
  };
  el.addEventListener('input',  handler);
  el.addEventListener('change', handler);
});

const validateRequired = () => {
  let firstInvalid = null;
  const seenRadioGroups = new Set();

  form.querySelectorAll('[required]').forEach((el) => {
    if (el.type === 'radio') {
      if (seenRadioGroups.has(el.name)) return;
      seenRadioGroups.add(el.name);
      const checked = form.querySelector(`input[name="${el.name}"]:checked`);
      if (!checked) {
        showFieldError(el, 'Vyberte prosím jednu z možností.');
        if (!firstInvalid) firstInvalid = el;
      } else {
        clearFieldError(el);
      }
    } else if (!el.value.trim()) {
      showFieldError(el, 'Vyplňte prosím toto pole.');
      if (!firstInvalid) firstInvalid = el;
    } else {
      clearFieldError(el);
    }
  });

  return firstInvalid;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstInvalid = validateRequired();
  if (firstInvalid) {
    const wrap = firstInvalid.closest('.form-field');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (firstInvalid.type !== 'radio') {
      firstInvalid.focus({ preventScroll: true });
    }
    status.className = 'form-status form-status--error';
    status.textContent = 'Vyplňte prosím všechna povinná pole.';
    return;
  }

  submit.disabled = true;
  status.className = 'form-status';
  status.textContent = 'Odesílám…';

  try {
    const res = await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      body: new FormData(form),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    form.reset();
    setConditionalVisible(false);
    status.classList.add('form-status--success');
    status.textContent = 'Děkujeme, odpověď jsme zaznamenali!';
  } catch (err) {
    console.error(err);
    status.classList.add('form-status--error');
    status.textContent = 'Odeslání se nezdařilo. Zkuste to prosím znovu.';
  } finally {
    submit.disabled = false;
  }
});
