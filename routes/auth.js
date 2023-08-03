const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password", "Please enter a valid password")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  //It is good to make the validtion meddleware in [], not must
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail()
      .custom((value, { req }) => {
        //value refer to the tested email
        // if (value === "test@test.com") {
        //   throw new Error("This email address is forbidden");
        // }
        // return true;
        return User.findOne({ email: value }).then((userDoc) => {
          //if there is not userDoc this function will implicitly return undefined
          //(since there is no explicit return statement in the function).
          if (userDoc) {
            //If the user exist this funcion return Error with "E-mail exists......" message
            return Promise.reject(
              "E-mail exists already, please try another one"
            );
          }
        });
      }),

    //body means "Hey, check the password form requestin body", it is the same as check()
    //The seconnd arg is the error message
    body(
      "password",
      "Please enter a valid password, with at least 5 character and with only numbers and text"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),

    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        //NOTE that 'confirmPassword' is the confirm password input name attribute
        if (value !== req.body.password) {
          throw new Error("Password should be match");
        }
        return true;
      }),
  ],

  authController.postSignup
);
//.isEmail is express-validator that checks if the email
//the form subimter insert non-email text in an area in email form
//"email" is the name attribute in this postSignup

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

module.exports = router;
