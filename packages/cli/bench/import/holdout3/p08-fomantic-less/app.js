const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use('/semantic', express.static(path.join(__dirname, 'semantic/dist')));
app.use('/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

app.use('/', require('./routes/index'));

app.listen(process.env.PORT || 3000);
