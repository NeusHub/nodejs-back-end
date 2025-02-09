const sqlite3 = require('sqlite3').verbose(),
      express = require('express'),
      User = require('./user'),
      Token = require('./token');

const app = express(),
      sqlite3Database = new sqlite3.Database('neushub.db');

app.use(express.json(), express.urlencoded({extended: true}));
app.listen(80);

app.get('/', (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  res.send([true]);
})

app.post('/signup', async (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  const user = new User(req.body['email'].toLowerCase());
  let signUp;

  if (!(await user.userCheck())) {
    signUp = await user.signup(
      req.body['full_name'].toLowerCase(),
      password = req.body['password'],
      created_at = req.body['created_at'],
      updated_at = req.body['updated_at'],
      admin = req.body['admin'],
    );
    res.send([signUp]);
  } else {
    res.send([false]);
  }
});

app.post('/signin', async (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  const user = new User(req.body['email'].toLowerCase());
  let signIn;

  if (await user.userCheck()) {
    signIn = await user.signIn(
      password = req.body['password'],
      ip = req.body['ip'],
    );
    res.send([(signIn != false) ? signIn : 'password not match']);
  } else {
    res.send(['user not found']);
  }
});

app.post('/deleteuser', async (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  const user = new User(req.body['email'].toLowerCase());
  let deleteUser;

  if (await user.userCheck()) {
    deleteUser = await user.delete(req.body['password']);
    res.send([(deleteUser) ? 'deleted' : 'password not match']);
  } else {
    res.send(['user not found']);
  }
});

app.post('/edituser', async (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  const user = new User(req.body['email'].toLowerCase());
  let deleteUser;

  if (await user.userCheck()) {
    deleteUser = await user.edit(
      email = req.body['edited_email'].toLowerCase(),
      password = req.body['password'],
      full_name = req.body['full_name'].toLowerCase(),
    );
    res.send([(deleteUser) ? 'edited' : 'password not match']);
  } else {
    res.send(['user not found']);
  }
});

app.get('/token', async (req, res, next) => {
  res.setHeader('Content-type', 'application/json');
  Token.deleteExpiredToken();
  const token = new Token(req.query['t']);
  const user_data = await User.getData(req.query['e'].toLowerCase());
  if (req.query['e'].toLowerCase() == '' || req.query['q'] == '') {
    res.send([false]);
  } else {
    res.send([await token.checkToken(req.query['e'].toLowerCase()), user_data]);
  }
});


sqlite3Database.serialize(() => {
  sqlite3Database.exec(`
    
  `);
  sqlite3Database.exec(`
    CREATE TABLE IF NOT EXISTS post (
      id INT(255) PRIMARY KEY UNIQUE NOT NULL,
      datetime DATETIME NOT NULL,
      title CHAR(255) NOT NULL,
      image_path CHAR(255) NOT NULL,
      description TEXT(2048),
      user_email CHAR(128) NOT NULL,
      category_id INT(255) NOT NULL,
      FOREIGN KEY (user_email) REFERENCES user(email),
      FOREIGN KEY (category_id) REFERENCES category(id),
      CHECK (user_email LIKE '%@%.%')
    );
    CREATE TABLE IF NOT EXISTS category (
      id INT(255) PRIMARY KEY UNIQUE NOT NULL,
      name CHAR(255) UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS post_rating (
      id INT (255) PRIMARY KEY UNIQUE NOT NULL,
      description TEXT(2048),
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      user_email CHAR(128) NOT NULL,
      post_id INT(255) NOT NULL,
      FOREIGN KEY (user_email) REFERENCES user(email),
      FOREIGN KEY (post_id) REFERENCES post(id),
      CHECK (user_email LIKE '%@%.%')
    );
    CREATE TABLE IF NOT EXISTS user (
      email CHAR(128) PRIMARY KEY UNIQUE NOT NULL,
      full_name CHAR(256) NOT NULL,
      password_hashed CHAR(256) NOT NULL,
      total_subscribers INT(255) NOT NULL DEFAULT 0,
      last_post_id INT(255),
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      admin BOOL DEFAULT 0,
      FOREIGN KEY (last_post_id) REFERENCES post(id),
      CHECK (email LIKE '%@%.%')
    );
    CREATE TABLE IF NOT EXISTS token (
      id CHAR(256) PRIMARY KEY UNIQUE NOT NULL,
      user_email CHAR(256) NOT NULL,
      created_at DATETIME NOT NULL,
      expired_at DATETIME NOT NULL,
      ip CHAR(132) NOT NULL,
      FOREIGN KEY (user_email) REFERENCES user(email)
    );
    CREATE TABLE IF NOT EXISTS password_token (
      id CHAR(256) PRIMARY KEY UNIQUE NOT NULL,
      user_email CHAR(256) NOT NULL,
      created_at DATETIME NOT NULL,
      expired_at DATETIME NOT NULL,
      ip CHAR(132) NOT NULL,
      FOREIGN KEY (user_email) REFERENCES user(email)
    );
    CREATE TABLE IF NOT EXISTS subscribe (
      id INT(256) PRIMARY KEY UNIQUE NOT NULL,
      user_email CHAR(128) NOT NULL,
      user_email_subscribed CHAR(128) NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (user_email) REFERENCES user(email),
      FOREIGN KEY (user_email_subscribed) REFERENCES user(email)
    );
    CREATE INDEX IF NOT EXISTS post_id ON post (
      id
    );
    CREATE INDEX IF NOT EXISTS category_id ON category (
      id,
      name
    );
    CREATE INDEX IF NOT EXISTS post_rating_id ON post_rating (
      id
    );
    CREATE INDEX IF NOT EXISTS user_email ON user (
      email
    );
    CREATE INDEX IF NOT EXISTS token_id ON token (
      id
    );
    CREATE INDEX IF NOT EXISTS password_token_id ON password_token (
      id
    );
    CREATE INDEX IF NOT EXISTS subscribe_id ON subscribe (
      id
    );
  `);
});