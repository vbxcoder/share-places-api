const express = require("express");
const { check } = require("express-validator");

const UsersController = require("../controllers/users-controller");
const fileUpload = require('../middleware/file-upload');

const router = express.Router();

router.get("/", UsersController.getUsers);

router.post(
  "/signup",
  fileUpload.single('image'),
  [
    check("name")
      .not()
      .isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 })
  ],
  UsersController.singUp
);

router.post("/login", UsersController.login);

module.exports = router;
