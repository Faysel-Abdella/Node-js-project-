module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  //otherwise allow to continue to the next middleware
  next();
};
