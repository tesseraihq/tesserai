(function () {
  var form = document.querySelector('.contact-form');
  if (!form) return;
  var error = form.querySelector('.form-error');
  var success = form.querySelector('.form-success');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = form.querySelector('input[name="email"]').value.trim();
    if (!email) {
      error.hidden = false;
      return;
    }
    error.hidden = true;
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          success.hidden = false;
        } else {
          error.hidden = false;
        }
      });
  });
})();
