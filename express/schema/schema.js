const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tasks: [
    {
      taskname: { type: String, required: true },
      datecreated: { type: Date },
      taskitems: [
        {
          item: { type: String },
          completed: { type: Boolean },
        },
      ],
    },
  ],
});


module.exports = {
  User: mongoose.model("User", userSchema),
};
