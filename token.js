const sqlite3 = require('sqlite3').verbose(),
      bcrypt = require('bcrypt'),
      crypto = require('crypto'),
      User = require('./user');

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
    let currentDatetime = (new Date()).toLocaleString('en-GB');
    sqlite3Database.serialize(() => {
      sqlite3Database.exec(`
        DELETE FROM token
        WHERE expired_at <= '${currentDatetime}';
      `);
    });
  }

  static editTokenEmail(email, newEmail) {
    let currentDatetime = (new Date()).toLocaleString('en-GB');

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
          expiredDatetime = addMonth(new Date());

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
          '${currentDatetime.toLocaleString('en-GB')}',
          '${expiredDatetime.toLocaleString('en-GB')}',
          '${(ip == null || ip == undefined || ip == '') ? '127.0.0.1' : ip}'
        );
      `);
    });
    return newToken;
  }

  async checkToken(email) {
    let expiredDatetime = addMonth(new Date()).toLocaleString('en-GB');

    return await new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.get(`
          SELECT id FROM token
          WHERE id LIKE '${this.token}' AND user_email LIKE'${email}';
        `, (err, row) => {
          if (err != null) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
        sqlite3Database.exec(`
          UPDATE token
          SET expired_at='${expiredDatetime}'
          WHERE id LIKE '${this.token}';
        `);
      });
    });
  }
}

function tokenGenerator(length) {
  let randomNumbers = Array.from({length: length});
  randomNumbers.map((value, index) => {
    randomNumbers[index] = String.fromCharCode(((Math.random() * 94) + 32).toFixed(0));
  });
  return randomNumbers.join('').replaceAll('\'', '1').replaceAll('"', '2').replaceAll('&', '3').replaceAll('=', '4').replaceAll('#', '5').replaceAll('\\', '6');
}

function addMonth(currentDatetime) {
  currentDatetime.setMonth(currentDatetime.getMonth() + 1);

  return currentDatetime;
}

module.exports = Token;
