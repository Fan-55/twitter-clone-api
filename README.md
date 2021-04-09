### Twitter Clone API
---
Twitter Clone API是為了復刻Twitter社群平台所設計的RESTful API，使用Node.js + Express開發，並搭配MySQL資料庫。

![](/pics/v1.gif)

### Demo
---
👉 前端 github page: https://hooty868.github.io/Twitter-API-Frontend-v1/#/signin

👉 前端 github repo: https://github.com/hooty868/Twitter-API-Frontend-v1

ℹ 請用下列使用者資料測試，或註冊一個新帳號，管理員角色請用從後台登入

| 帳號 |密碼|角色|
| ------------- |-------------|-------------|
| user1 |12345678|一般使用者|
| user2 |12345678|一般使用者|
| user3 |12345678|一般使用者|
| root |12345678|管理員|

👉 後端 heroku: https://simple-twitter-2020.herokuapp.com/

ℹ 後端請用[Postman](https://www.postman.com/)測試


### Features
---
搭配前端畫面，一般使用者可以:
- 註冊一個新帳號
- 登入前台
- 修改使用者資料
- 新增推文
- 對推文新增留言
- 對推文按like
- 追隨、取消追隨其他使用者
- 上傳個人封面照片
- 參加公開聊天室
- 看見追隨人數Top10的使用者清單

管理員可以: 
- 登入後台
- 查看所有使用者清單
- 查看所有推文清單


### ERD
---
![](/pics/twitter-ERD.png)

### RESTful API
---

詳細規格請參考 [API文件](https://www.notion.so/Twitter-RESTful-API-311af7abdbe94ce48034568062ed5f82)

| 編號  | Routes |
| ------------- |-------------|
| 1 |GET /api/admin/users|
| 2 |DELETE /api/admin/tweets/:id|
| 3 |POST /api/followships|
| 4 |DELETE /api/followships/:followingId|
| 5 |POST /api/tweets/:id/like|
| 6 |POST /api/tweets/:id/unlike|
| 7 |POST /api/tweets/:tweet_id/replies|
| 8 |GET /api/tweets/:tweet_id/replies|
| 9 |POST /api/tweets|
| 10 |GET /api/tweets|
| 11 |GET /api/tweets/:tweet_id|
| 12 |POST /api/users|
| 13 |GET /api/users/:id|
| 14 |GET /api/users/:id/tweets|
| 15 |GET /api/users/:id/replied_tweets|
| 16 |GET /api/users/:id/likes|
| 17 |GET /api/users/:id/followings|
| 18 |GET /api/users/:id/followers|
| 19 |PUT /api/users/:id|
| 20 |PUT /api/users/:id/setting|
| 21 |POST /api/login|
| 22 |GET /api/users/top|
| 23 |GET /api/admin/tweets|
| 24 |GET /api/get_current_user|

### Run Locally
---
1. Clone this repository

```
$ clone https://github.com/Fan-55/twitter-clone-api.git
```

2. Go to the root folder

```
$ cd twitter-clone-api
```

3. Install required packages

```
$ npm install
```

4. Create `.env` file in root directory and set the env variables based on `.env.example` file. For imgur client ID and secrect, please register your own application. Check [here](https://api.imgur.com/oauth2/addclient). 

```
PORT=
JWT_SECRET=
IMGUR_CLIENT_ID=
IMGUR_SECRET=
```

5. Connect to MySQL database according to the setup in `./config/config.json` 

```
"development": {
    "username": "YOUR USERNAME",
    "password": "YOUR PASSWORD",
    "database": "YOUR DB NAME",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "operatorsAliases": false
  }
```

6. Execute DB migrations

```
$ npx sequelize db:migrate
```

7. Execute DB seeders

```
$ npx sequelize db:seed:all
```

8. Run the app and you are good to go!

```
$ npm start
```

#### Collaborator
---
[Elliott Wu](https://github.com/elliottwuTW)