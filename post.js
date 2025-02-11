const sqlite3 = require('sqlite3');

const sqlite3Database = new sqlite3.Database('neushub.db');

class Post {
  constructor(
    title,
    imageName,
    user_email,
    category_name,
    description = '',
    datetime = new Date(),
  ) {
    datetime = datetime.getTime();
    sqlite3Database.serialize(() => {
      sqlite3Database.exec(`
        INSERT INTO post (
          title,
          image_path,
          description,
          user_email,
          category_name,
          created_at,
          updated_at
        ) VALUES (
          '${title}',
          'post_images/${imageName}',
          '${description}',
          '${user_email}',
          '${category_name}',
          ${datetime},
          ${datetime}
        );
      `, (err) => {
        if (err != null) {
          throw err;
        }
      });
    });
  }

  static async allCategories() {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        let categories = {};
        sqlite3Database.all(`
          SELECT name FROM category;
        `, (err, row) => {
          row.forEach(name => {
            categories[name['name']] = [];
          });
          resolve(categories);
        });
      });
    });
  }

  static async allPosts(categoties) {
    return new Promise((resolve, reject) => {
      sqlite3Database.serialize(() => {
        sqlite3Database.all(`
          SELECT
            title,
            image_path,
            description,
            category_name,
            user_email FROM post;
        `, (err, row) => {
          for (const name in categoties) {
            row.forEach(post => {
              if (post['category_name'] == name)
                categoties[name].push(post);
            });
          }
          resolve(categoties);
        });
      });
    });
  }
}

module.exports = Post;