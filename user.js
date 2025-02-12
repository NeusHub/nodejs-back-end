const sqlite3 = require('sqlite3').verbose(),
  bcrypt = require('bcrypt'),
  Token = require('./token');

const sqlite3Database = new sqlite3.Database('neushub.db');

class User {
  email = '';

  constructor(email) {
    this.email = email;
    if (this.email.length < 1) {
      throw new Error('email is empty');
    } else if (!this.email.includes('@')) {
      throw new Error('email is not valid');
    }
  }

  async userCheck() {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.get(`
          SELECT email
          FROM user
            WHERE email=?;
        `, [this.email], (err, row) => {
          if (err) {
            reject(false);
          } else {
            resolve((row == undefined) ? false : true);
          }
        });
      });
    });
  }

  async passwordCheck(password) {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.get(`
          SELECT email, password_hashed
          FROM user
            WHERE email=?;
        `, [this.email], async (err, row) => {
          if (err) {
            reject('email or password error');
          } else {
            let equalPassword = await bcrypt.compare(password, row['password_hashed']);
            resolve(equalPassword);
          }
        });
      });
    });
  }

  async signup(
    full_name, // string
    password,
    created_at = (new Date()).getTime(),
    updated_at = (new Date()).getTime(),
    admin = 0,
  ) {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.exec(`
          INSERT INTO user (
            email,
            full_name,
            password_hashed,
            total_subscribers,
            created_at,
            updated_at,
            admin
          ) VALUES (
            '${this.email}',
            '${full_name}',
            '${bcrypt.hashSync(password, 12)}',
            '0',
            '${(created_at == undefined || created_at == '') ? (new Date()).getTime() : created_at}',
            '${(updated_at == undefined || updated_at == '') ? (new Date()).getTime() : updated_at}',
            ${(admin == undefined) ? 0 : admin}
          );
        `, (err) => {
          if (err == null) {
            Token.deleteExpiredToken();
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    });
  }

  async signIn(password, ip = '127.0.0.1') {
    if (await this.passwordCheck(password)) {
      let data = await new Promise((resolve, reject) => {
        sqlite3Database.get(`
          SELECT *
          FROM user
            WHERE email=?;
        `, [this.email], (err, row) => {
          resolve(row);
        })
      });
      Token.deleteExpiredToken();
      data['token'] = await Token.create(this.email, ip);
      return data;
    } else {
      return false;
    }
  }

  static async getData(email) {
    return await new Promise((resolve, reject) => {
      sqlite3Database.get(`
        SELECT email, full_name, total_subscribers, last_post_id, created_at, updated_at
        FROM user
          WHERE email=?;
      `, [email], (err, row) => {
        if (err == null && row != undefined) {
          resolve(row);
        } else {
          resolve(false);
        }
      })
    });
  }

  async delete(password) {
    if (await this.passwordCheck(password)) {
      sqlite3Database.serialize(() => {
        sqlite3Database.exec(`
          DELETE FROM user
            WHERE email='${this.email}';
        `);
      });
      Token.deleteExpiredToken();
      Token.deleteUser(this.email);
      return true;
    } else {
      return false; // password not match
    }
  }

  static async getTotalSubscribers(other_user) {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.get(`
          SELECT email, total_subscribers
          FROM user
          WHERE email LIKE '${other_user}';
        `, (err, row) => {
          if (err == null && row != undefined) {
            resolve(row['total_subscribers']);
          } else {
            resolve(false);
          }
        });
      });
    });
  }

  async subscribed(other_user) {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.get(`
          SELECT user_email, user_email_subscribed
          FROM subscribe
          WHERE user_email LIKE '${this.email}' AND user_email_subscribed LIKE '${other_user}';
        `, (err, row) => {
          if (err == null && row != undefined) {
            resolve(row);
          } else {
            resolve(false);
          }
        });
      });
    });
  }

  async addSubscriber(total_subscribers, other_user) {
    return new Promise((resolve, reject) => {
      let currentDatetime = new Date().getTime();
      sqlite3Database.serialize(() => {
        sqlite3Database.exec(`
          UPDATE user
          SET total_subscribers=${total_subscribers + 1}
          WHERE email LIKE '${other_user.toLowerCase()}';
          INSERT INTO subscribe (
            user_email,
            user_email_subscribed,
            created_at,
            updated_at
          ) VALUES (
            '${this.email.toLowerCase()}',
            '${other_user.toLowerCase()}',
            ${currentDatetime},
            ${currentDatetime}
          );
        `, (err) => {
          if (err != null) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    });
  }

  async edit(
    email,
    password,
    full_name,
  ) {
    if (await this.passwordCheck(password)) {
      let emailEqual = await new Promise((resolve, reject) => {
        sqlite3Database.serialize(() => {
          sqlite3Database.get(`
            SELECT email
            FROM user
              WHERE email LIKE ?;
          `, [email], (err, row) => {
            if (row != undefined) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      });

      sqlite3Database.serialize(() => {
        sqlite3Database.exec(`
          UPDATE user
          SET ${(email == '' || email == undefined || email == null || email == this.email) ? '' : ('email=\'' + email + '\',')}
              ${(full_name == undefined || full_name == null) ? '' : 'full_name=\'' + full_name + '\','}
              ${(email == '' || email == undefined || email == null || emailEqual) ? '' : ('email=\'' + email + '\',')}
              ${'updated_at=\'' + (new Date()).toLocaleString('en-GB') + '\''}
            WHERE email='${this.email}';    
        `);
      });

      Token.editTokenEmail(this.email, email);
      Token.deleteExpiredToken();
      return true;
    } else {
      return false;
    }
    }
  }

module.exports = User;