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
    created_at = (new Date()).toLocaleString('en-GB', {hour12: false}),
    updated_at = (new Date()).toLocaleString('en-GB', {hour12: false}),
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
            '${(created_at == undefined || created_at == '') ? (new Date()).toLocaleString('en-GB', {hour12: false}) : created_at}',
            '${(updated_at == undefined || updated_at == '') ? (new Date()).toLocaleString('en-GB', {hour12: false}) : updated_at}',
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

  async signIn(password) {
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
      data['token'] = await Token.create(this.email);
      return data;
    } else {
      return false;
    }
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
              ${(full_name.length < 3 || full_name == undefined || full_name == null) ? '' : 'first_name=\'' + full_name.toUpperCase() + full_name.toLowerCase().slice(1) + '\','}
              ${'nick_name=\'' + ((nick_name == undefined) ? '' : nick_name) + '\','}
              ${(email == '' || email == undefined || email == null || emailEqual) ? '' : ('email=\'' + email + '\',')}
              ${'updated_at=\'' + (new Date()).toLocaleString('en-GB', {hour12: false}) + '\''}
            WHERE email='${this.email}';    
        `);
      });

      Token.editTokenUsername(this.email, email);
      Token.deleteExpiredToken();
      return true;
    } else {
      return false;
    }
    }
  }

module.exports = User;