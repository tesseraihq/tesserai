const router = require('express').Router();

router.get('/', (req, res) => {
  res.render('dashboard', {
    user: req.session.user,
    routesToday: [
      { code: 'N-14', driver: 'P. Okafor', stops: 22, state: 'ok' },
      { code: 'E-03', driver: 'L. Brandt', stops: 17, state: 'late' },
    ],
  });
});

module.exports = router;
