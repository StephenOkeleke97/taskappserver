const express = require("express");
const session = require("express-session");
const main = require("./entry");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const { User } = require("./schema/schema");
const cors = require("cors");
const corsOptions = {
  cors: true,
  origin: ["https://taskappbysteve.herokuapp.com", "http://localhost:3000"],
  credentials: true,
};
const app = express();
app.set('trust proxy', 1);
const TWO_HOURS = 1000 * 60 * 60 * 2;

const {
  PORT = 5100,

  SESS_LIFETIME = TWO_HOURS,
  SESS_NAME = "sid",
  SESS_SECRET = "secretkey",
} = process.env;

const client = connectDB().catch((error) => {
  console.log(error);
});

async function connectDB() {
  await mongoose.connect(
    "mongodb+srv://user:password123$" +
      "@chatdb.qj8op.mongodb.net/chatDB?retryWrites=true&w=majority"
  );
  console.log("Connected to database");
  return mongoose.connection.getClient();
}

async function findUser(username, password) {
  if (!password) {
    const user = await User.findOne({
      username: username,
    });
    return user;
  }
  const user = await User.findOne({
    username: username,
    password: password,
  });
  return user;
}

async function findUserById(id) {
  const user = await User.findById(id);
  return user;
}

async function addUser(username, password) {
  const user = new User({ username: username, password: password });
  await user.save();
}

const redirectHome = (req, res, next) => {
  if (req.session.userId) {
    res.redirect("/home");
  } else {
    next();
  }
};

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

app.use(cors(corsOptions));

app.set("trust proxy", 1);
app.use(
  session({
    name: SESS_NAME,
    proxy: true,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    store: MongoStore.create({
      client,
      dbName: "chatDB",
      touchAfter: 1 * 3600,
    }),
    cookie: {
      maxAge: SESS_LIFETIME,
      sameSite: "none",
      secure: true,
      httpOnly: true
    },
  })
);

app.use("/api", main);

app.post("/loggedin", (req, res) => {
  if (req.session.userId) {
    const user = User.findById(req.session.userId);
    user
      .then((result) => {
        if (result) res.send(result);
      })
      .catch((error) => {
        console.log(error);
        res.sendStatus(500);
      });
    return;
  }
  res.sendStatus(401);
});

app.post("/login", redirectHome, (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    const user = findUser(username, password);
    user
      .then((result) => {
        if (result) {
          req.session.userId = result._id;
          res.sendStatus(200);
        } else {
          res.status(401).send("Invalid username or password");
        }
      })
      .catch((error) => {
        console.log(error);
        res.sendStatus(500);
      });
    return;
  }
  res.sendStatus(401);
});

app.post("/register", redirectHome, (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    const user = findUser(username);
    user.then((result) => {
      if (result) {
        res.status(400).send("Username is taken");
      } else {
        addUser(username, password)
          .then((result) => {
            res.status(200).send("Success");
          })
          .catch((error) => {
            console.log(error);
            res.sendStatus(500);
          });
      }
    });
  }
});

app.post("/tasks", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }

  const { taskname } = req.body;
  if (!taskname) {
    res.sendStatus(400);
    return;
  }

  const user = findUserById(req.session.userId);
  user.then((result) => {
    if (result) {
      const id = new mongoose.Types.ObjectId();
      const date = new Date();
      result.tasks.push({
        _id: id,
        taskname: taskname,
        datecreated: date,
      });
      result.save();
      res.status(200).send({
        _id: id,
        datecreated: date,
        taskname: taskname,
        taskitems: [],
      });
    }
  });
});

app.post("/taskitem", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }
  const { itemname, taskid } = req.body;
  const user = findUserById(req.session.userId);
  user.then((result) => {
    if (result) {
      const task = result.tasks.filter(
        (task) => task._id.valueOf() === taskid
      )[0];
      const id = new mongoose.Types.ObjectId();
      task.taskitems.push({
        _id: id,
        item: itemname,
        completed: false,
      });
      result.save((err, doc) => {
        if (!err) {
          res.status(200).send(id);
        }
      });
    } else {
      res.sendStatus(400);
    }
  });
  return;
});

app.put("/taskitem", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }

  const { taskid, taskitemid } = req.body;
  const user = findUserById(req.session.userId);
  user.then((result) => {
    if (result) {
      const task = result.tasks.filter(
        (task) => task._id.valueOf() === taskid
      )[0];
      const taskitem = task.taskitems.filter(
        (item) => item._id.valueOf() === taskitemid
      )[0];
      taskitem.completed = true;
      result.save();
      res.sendStatus(200);
    }
  });
  return;
});

app.delete("/taskitem", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }

  const { taskid, taskitemid } = req.query;
  const user = findUserById(req.session.userId);
  user.then((result) => {
    if (result) {
      const task = result.tasks.filter(
        (task) => task._id.valueOf() === taskid
      )[0];
      const taskitems = task.taskitems.filter(
        (item) => item._id.valueOf() !== taskitemid
      );
      task.taskitems = taskitems;
      result.save();
      res.sendStatus(200);
    }
  });
  return;
});

app.delete("/tasks", (req, res) => {
  if (!req.session.userId) {
    res.sendStatus(401);
    return;
  }

  const { taskid } = req.query;
  const user = findUserById(req.session.userId);
  user.then((result) => {
    if (result) {
      const tasks = result.tasks.filter(
        (task) => task._id.valueOf() !== taskid
      );
      result.tasks = tasks;
      result.save();
      res.sendStatus(200);
    }
  });
  return;
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) res.clearCookie(SESS_NAME);
    res.send("Success");
  });
});

app.listen(PORT, () => {
  console.log("App listening on port", PORT);
});
