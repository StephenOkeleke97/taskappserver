const express = require("express");
const { User, Chat } = require("./schema/schema");

const router = express.Router();

async function findUser(id) {
  const user = await User.findById(id, { password: 0 });
  return user;
}

router.get("/user", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }

  const user = findUser(req.session.userId);
  user
    .then((result) => {
      if (result) res.status(200).send(result);
      else res.redirect("../login");
    })
    .catch((error) => res.sendStatus(500));

  return;
});

module.exports = router;
