const bcrypt = require('bcryptjs')
const { commerce } = require('faker')
const jwt = require('jsonwebtoken')
const { User, Tweet, Like, Reply, sequelize, Sequelize } = require('../models/index')
const QueryTypes = Sequelize.QueryTypes
const { isEmailValid } = require('../utils/helpers')
const helpers = require('../_helpers')
const replyController = require('./replyController')

module.exports = {
  createUser: async (req, res, next) => {
    const errors = []
    //check required fields
    const { account, name, email, password, checkPassword } = req.body
    if (!account.trim() || !name.trim() || !email.trim() || !password.trim() || !checkPassword.trim()) {
      errors.push('所有欄位皆為必填')
    }
    //check if password matches checkPassword
    if (password !== checkPassword) {
      errors.push('密碼和確認密碼不相符')
    }
    //check if the email's format is valid
    if (!isEmailValid(email)) {
      errors.push('Email格式錯誤')
    }

    try {
      const [duplicateAccount, duplicateEmail] = await Promise.all([
        User.findOne({ where: { account } }),
        User.findOne({ where: { email } })
      ])
      if (duplicateAccount) {
        errors.push('帳號重複')
      }
      if (duplicateEmail) {
        errors.push('Email已被註冊')
      }
      if (errors.length) {
        return res.json({ status: 'error', message: errors })
      }

      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
      await User.create({ account, name, email, password: hash })
      return res.json({ status: 'success', message: '註冊成功' })
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  login: async (req, res, next) => {
    try {
      const { account, password } = req.body

      if (!account.trim() || !password.trim()) {
        return res.json({ status: 'error', message: '帳號和密碼不可為空白' })
      }

      const user = await User.findOne({ where: { account } })
      if (!user) {
        return res.status(401).json({ status: 'error', message: '帳號或密碼錯誤' }) //in case of brute force attack on email
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ status: 'error', message: '帳號或密碼錯誤' })
      }

      const payload = { id: user.id }
      const token = jwt.sign(payload, process.env.JWT_SECRET)
      return res.json({
        status: 'success',
        message: '成功登入',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  getUsers: async (req, res, next) => {
    try {
      const users = await sequelize.query(`
        SELECT U.id, U.name, U.account, U.cover, U.avatar, IFNULL(F1.followingCount, 0) AS followingCount, IFNULL(F2.followerCount, 0) AS followerCount, IFNULL(T.tweetCount, 0) AS tweetCount, CAST(IFNULL(L.likedCount, 0) AS UNSIGNED) AS LikedCount
        FROM Users AS U

        LEFT JOIN (SELECT followerId, COUNT(followerId) AS followingCount FROM Followships GROUP BY followerId) AS F1
        ON F1.followerId = U.id

        LEFT JOIN (SELECT followingId, COUNT(followingId) AS followerCount FROM Followships GROUP BY followingId) AS F2
        ON F2.followingId = U.id

        LEFT JOIN (SELECT UserId, COUNT(UserId) AS tweetCount FROM Tweets GROUP BY UserId) AS T
        ON T.UserId = U.id

        LEFT JOIN (
        SELECT T.UserId, SUM(L.likeCount) AS likedCount
        FROM Tweets AS T
        LEFT JOIN (SELECT TweetId, COUNT(TweetId) AS likeCount FROM Likes GROUP BY TweetId) AS L
        ON T.id = L.TweetId
        GROUP BY T.UserId) AS L
        ON L.UserId = U.id;`,
        { type: QueryTypes.SELECT })
      res.json(users)
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  getTopUsers: async (req, res, next) => {
    try {
      let topUsers = await sequelize.query(`
        SELECT F.followingId, name,account,avatar, IF(isFollowed.followingId, true, false) AS isFollowed
        FROM Users AS U
        INNER JOIN (SELECT followingId, COUNT(followingId) AS followerCount FROM Followships WHERE followingId <> ${req.user.id} GROUP BY followingId LIMIT 10) AS F
        ON U.id = F.followingId
        LEFT JOIN (SELECT followingId FROM Followships WHERE followerId = ${req.user.id} ) AS isFollowed
        ON U.id = isFollowed.followingId
        ORDER BY F.followingId;`,
        { type: QueryTypes.SELECT })
      res.json(topUsers)
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  getUser: async (req, res, next) => {
    try {
      const user = await sequelize.query(`
        SELECT U.id,account,name,email,avatar,cover,introduction,role, IFNULL(a.followerCount,0) AS followerCount, IFNULL(b.followingCount,0) AS followingCount, IF(c.isFollowed, true, false) AS isFollowed
        FROM Users AS U

        LEFT JOIN (
        SELECT followingId, COUNT(followingId) AS followerCount
        FROM Followships
        WHERE followingId = ${req.params.id}
        GROUP BY followingId) AS a
        ON a.followingId = U.id

        LEFT JOIN (
        SELECT followerId, COUNT(followerId) AS followingCount
        FROM Followships
        WHERE followerId = ${req.params.id}
        GROUP BY followerId) AS b
        ON b.followerId = U.id

        LEFT JOIN(
        SELECT followingId AS isFollowed
        FROM Followships
        WHERE followerId = ${helpers.getUser(req).id}
        ) AS c
        ON c.isFollowed = U.id

        WHERE U.id = ${req.params.id};`,
        { plain: true, type: QueryTypes.SELECT })

      if (!user) {
        return res.json({ status: 'error', message: '使用者不存在' })
      }
      if (user.role === 'admin') {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' })
      }
      delete user.role //not required on frontend
      if (helpers.getUser(req).id === Number(req.params.id)) {
        user.isCurrentUser = true
      }
      res.json(user)
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  getTweets: async (req, res, next) => {
    try {
      let tweets = await sequelize.query(`
        SELECT T.*, IFNULL(L.likedCount, 0) AS likedCount, IFNULL(R.repliedCount, 0) AS repliedCount
        FROM Tweets AS T
        LEFT JOIN (SELECT TweetId, COUNT(TweetId) AS likedCount FROM Likes GROUP BY TweetId) AS L
        ON L.TweetId = T.id
        LEFT JOIN (SELECT TweetId, COUNT(TweetId) AS repliedCount FROM Replies GROUP BY TweetId) AS R
        ON R.TweetId = T.id
        WHERE T.UserId = ${req.params.id}`
        , { type: QueryTypes.SELECT })
      let user = await sequelize.query(`
        SELECT id,name,account,avatar FROM Users WHERE id=${req.params.id};`,
        { plain: true, type: QueryTypes.SELECT }
      )
      tweets = tweets.map(t => ({
        user,
        ...t
      }))
      res.json(tweets)
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  updateUser: async (req, res, next) => { //編輯個人資料 name, avatar, introduction, cover
    if (helpers.getUser(req).id !== Number(req.params.id)) {
      return res.json({ status: 'error', message: '無權編輯' })
    }
    const { name, introduction } = req.body
    if (!name.trim()) {
      return res.json({ status: 'error', message: '名稱不能空白' })
    }
    try {
      const user = await User.findByPk(req.params.id)
      /* if req.files object contains cover or avatar, upload the image file to imgur and get the link
       * The condition "req.files !== undefined" is for testing. Otherwise, it is not necessary. 
       */
      if (req.files !== undefined) {
        if (Object.keys(req.files).length) {
          const { uploadToImgur } = require('../utils/helpers')
          let [cover, avatar] = [user.cover, user.avatar]
          if (req.files.cover) {
            cover = await uploadToImgur(req.files.cover[0].path)
          }
          if (req.files.avatar) {
            avatar = await uploadToImgur(req.files.avatar[0].path)
          }
          await user.update({ name, introduction, cover, avatar })
          return res.json({ status: 'success', message: '修改成功' })
        }
      }
      //if req.files object is empty, update only name and introduction
      await user.update({ name, introduction })
      return res.json({ status: 'success', message: '修改成功' })
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  updateUserSetting: async (req, res, next) => { //設定
    if (helpers.getUser(req).id !== Number(req.params.id)) {
      return res.json({ status: 'error', message: '無權編輯' })
    }
    const errors = []
    //check required fields
    const { account, name, email, password, checkPassword } = req.body
    if (!account.trim() || !name.trim() || !email.trim() || !password.trim() || !checkPassword.trim()) {
      errors.push('所有欄位皆為必填')
    }
    //check if password matches checkPassword
    if (password !== checkPassword) {
      errors.push('密碼和確認密碼不相符')
    }
    //check if the email's format is valid
    if (!isEmailValid(email)) {
      errors.push('Email格式錯誤')
    }
    try {
      const user = await User.findByPk(req.params.id)
      //check duplicate email and account if the inputs are different from the original data
      if (account !== user.account) {
        const duplicateAccount = await User.findOne({ where: { account } })
        if (duplicateAccount) {
          errors.push('帳號重複')
        }
      }
      if (email !== user.email) {
        const duplicateEmail = await User.findOne({ where: { email } })
        if (duplicateEmail) {
          errors.push('Email已被註冊')
        }
      }
      if (errors.length) {
        return res.json({ status: 'error', message: errors })
      }
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
      await user.update({ account, name, email, password: hash })
      return res.json({ status: 'success', message: '修改成功' })
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  },
  getRepliedTweets: async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id)
      if (!user) {
        return res.json({ status: 'error', message: '使用者不存在' })
      }

      let replies = await Reply.findAll({
        where: { UserId: req.params.id },
        include: [{
          model: Tweet,
          attributes: {
            include: [
              [sequelize.literal(`EXISTS(SELECT L.TweetId FROM Likes AS L WHERE L.UserId = ${helpers.getUser(req).id} AND L.TweetId = Tweet.id)`), 'isLiked']
            ]
          },
          include: [{
            model: User,
            attributes: ['id', 'name', 'account', 'avatar']
          }]
        }]
      })
      replies = replies.map(r => ({ ...r.toJSON() }))
      return res.json(replies)
    } catch (err) {
      console.log(err)
      return res.status(500).json({ status: 'error', message: '內部伺服器錯誤' })
    }
  }
}