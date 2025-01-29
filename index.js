const sqlite3 = require('sqlite3').verbose(),
      express = require('express');

const app = express(),
      sqlite3Database = new sqlite3.Database('neushub.db');

app.use(express.json(), express.urlencoded({extended: true}));
app.listen(8000);

app.get('/', (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  res.send({'status': 'connected'});
})