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
      el.setCustomValidity('');
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

/* Localize the browser's native validation tooltips to Czech.
   Without this they show in the user's browser locale (often English). */
form.querySelectorAll('[required]').forEach((el) => {
  el.addEventListener('invalid', () => {
    el.setCustomValidity(el.type === 'radio'
      ? 'Vyberte prosím jednu z možností.'
      : 'Vyplňte prosím toto pole.');
  });

  /* On change/input, clear the custom message. For radios we must clear
     every option in the group — otherwise a leftover message on the
     unchecked sibling keeps the whole group "invalid" even after the
     user picks an answer. */
  const clear = () => {
    if (el.type === 'radio') {
      form.querySelectorAll(`input[type="radio"][name="${el.name}"]`)
          .forEach((r) => r.setCustomValidity(''));
    } else {
      el.setCustomValidity('');
    }
  };
  el.addEventListener('input',  clear);
  el.addEventListener('change', clear);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

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
