/* RSVP form → Google Apps Script Web App.

   1. Open your Google Sheet → Extensions → Apps Script.
   2. Paste this into Code.gs:

        function doPost(e) {
          const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
          const p = e.parameter;
          sheet.appendRow([
            new Date(),
            p.jmeno || '',
            p.ucast || '',
            p.ubytovani || '',
            p.jidlo || '',
            p.jidelni_omezeni || '',
            p.poznamky || ''
          ]);
          return ContentService
            .createTextOutput(JSON.stringify({ ok: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }

      (Optional: put these headers in row 1 of the sheet —
       Čas | Jméno | Účast | Ubytování | Jídlo | Omezení | Poznámky)

   3. Deploy → New deployment → Web app
        - Execute as: Me
        - Who has access: Anyone
      Copy the resulting /exec URL and paste it into RSVP_ENDPOINT below.
   4. Every redeploy changes the URL — use "Manage deployments" → edit
      existing deployment (version: New version) to keep the same URL. */

const RSVP_ENDPOINT = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec';

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

/* Clear the inline error as soon as the user fixes the field. */
form.querySelectorAll('input, textarea').forEach((el) => {
  const handler = () => {
    if (el.type === 'radio') {
      if (form.querySelector(`input[name="${el.name}"]:checked`)) {
        clearFieldError(el);
      }
    } else if (el.value.trim()) {
      clearFieldError(el);
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
