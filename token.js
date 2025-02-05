const sqlite3 = require('sqlite3').verbose(),
      bcrypt = require('bcrypt'),
      crypto = require('crypto');

const sqlite3Database = new sqlite3.Database('neushub.db');

class Token {
  token;

  constructor(token) {
    this.token = token;
  }

  static deleteUser(email) {
    sqlite3Database.serialize(() => {
      sqlite3Database.exec(`
        DELETE FROM token
        WHERE user_email='${email}';
      `);
    });
  }

  static deleteExpiredToken() {
    let currentDatetime = (new Date()).toLocaleString('en-GB', {hour12: false});
    sqlite3Database.serialize(() => {
      sqlite3Database.exec(`
        DELETE FROM token
        WHERE expired_at < '${currentDatetime}';
      `);
    });
  }

  static editTokenUsername(email, newEmail) {
    let currentDatetime = (new Date()).toLocaleString('en-GB', {hour12: false});

    sqlite3Database.serialize(() => {
      sqlite3Database.exec(`
        UPDATE token
        SET user_email='${newEmail}',
            expired_at='${currentDatetime}'
        WHERE user_email='${email}';
      `);
    });
  }

  static async create(email, ip = '127.0.0.1', length = 64) {
    let newToken = tokenGenerator(length);

    while (
      await new Promise((resolve, reject) => {
        sqlite3Database.serialize(() => {
          sqlite3Database.get(`
            SELECT id FROM token
            WHERE id='${newToken}';
          `, (err, row) => {
            resolve(row != undefined); //  check if token found
          });
        });
      })
    ) {
      newToken = tokenGenerator(length);
    };

    sqlite3Database.serialize(() => {
      let currentDatetime = new Date(),
          expiredDatetime = addMonth(currentDatetime);
      sqlite3Database.exec(`
        INSERT INTO token (
          id,
          user_email,
          created_at,
          expired_at,
          ip
        ) VALUES (
          '${newToken}',
          '${email}',
          '${currentDatetime.toLocaleString('en-GB', {hour12: false})}',
          '${expiredDatetime.toLocaleString('en-GB', {hour12: false})}',
          '${ip}'
        );
      `);
    });
    return newToken;
  }
}

function tokenGenerator(length) {
  let randomNumbers = Array.from({length: length});
  randomNumbers.map((value, index) => {
    randomNumbers[index] = String.fromCharCode(((Math.random() * 94) + 32).toFixed(0));
  });
  return randomNumbers.join('').replaceAll('\'', '1');
}

function addMonth(currentDate) {
  currentDate.setMonth(currentDate.getMonth() + 1);
  return currentDate.toLocaleString('en-GB', { hour12: false });
}

module.exports = Token;
