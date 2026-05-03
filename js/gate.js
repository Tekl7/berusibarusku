/* Heslem chráněný vstup na stránku.
 *
 * POZOR: tahle ochrana je čistě klientská a heslo je čitelné v source
 * kódu. Stačí na to, aby stránku omylem neviděl náhodný návštěvník
 * nebo aby se nedostala do Googlu — neochrání proti někomu, kdo se
 * cíleně snaží dovnitř.
 *
 * Heslo měň jen tady. Po správném zadání se uloží do localStorage,
 * takže host už ho při dalších návštěvách na tomto zařízení nezadává.
 */
const GATE_PASSWORD = 'komarisezenili';

const html    = document.documentElement;
const gate    = document.querySelector('.gate');
const form    = document.getElementById('gate-form');
const input   = document.getElementById('gate-input');
const errorEl = document.getElementById('gate-error');

const unlock = () => {
  localStorage.setItem('wedding-gate', 'ok');
  html.classList.remove('gate-locked');
  gate.remove();
};

if (localStorage.getItem('wedding-gate') === 'ok') {
  // Inline script v <head> už zámek sundal — uklidíme overlay z DOMu.
  gate.remove();
} else {
  input.focus();
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value === GATE_PASSWORD) {
    unlock();
  } else {
    errorEl.textContent = 'Nesprávné heslo. Zkuste to prosím znovu.';
    input.select();
  }
});

input?.addEventListener('input', () => {
  errorEl.textContent = '';
});
