const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
//validationResult is a function that allows us to gather all the errors
//prior validation middleware like -check('email').isEmail- might have thrown or might have stored.

const User = require("../models/user");

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  //Step 1: extract the email and the password
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors, "and", errors.array()[0].msg);
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password },
      validationErrors: errors.array(),
    });
  }
  //Step 2: find the user by email
  User.findOne({ email: email })
    .then((user) => {
      //if the user does not exist(user is undefined w/ is falsy value)
      //redirect to login
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "login",
          errorMessage: "Inavlid email or password",
          oldInput: { email: email, password: password },
          validationErrors: [],
        });
      }
      //Step 3: if the email exist, check the input password is true
      //bcrypt(inputPassword, password in database)
      bcrypt
        .compare(password, user.password)
        .then((result) => {
          //result is a boolean value, for comparing
          if (result) {
            //redirect to the starting page
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "login",
            errorMessage: "Inavlid email or password",
            oldInput: { email: email, password: password },
            validationErrors: [],
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  //Step 1: extarct the user data from the signup form
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  //errors now is the collection of errors thrown from check('email').isEmail
  //if it is empty this means no error
  console.log(errors.array());
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    //bcrypt is async task, give us promise with hashed result
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset",
    errorMessage: req.flash("error"),
  });
};
