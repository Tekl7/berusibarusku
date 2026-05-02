/* Flip cards: clicking [data-flip-trigger] inside a [data-flip-card]
   adds .is-flipped to the card; [data-flip-close] removes it. ESC also
   closes any flipped card. */
document.querySelectorAll('[data-flip-card]').forEach((card) => {
  card.querySelectorAll('[data-flip-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      card.classList.add('is-flipped');
    });
  });
  card.querySelectorAll('[data-flip-close]').forEach((close) => {
    close.addEventListener('click', () => {
      card.classList.remove('is-flipped');
    });
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('[data-flip-card].is-flipped').forEach((c) => {
    c.classList.remove('is-flipped');
  });
});
