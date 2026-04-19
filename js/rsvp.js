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
