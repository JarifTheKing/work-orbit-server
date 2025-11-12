require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");

// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// Firebase MiddleWare
const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
  try {
    const decode = await admin.auth().verifyIdToken(token);
    req.token_email = decode.email;
    console.log("inside token", decode);

    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
};

const uri = `mongodb+srv://${process.env.WORK_ORBIT_USER}:${process.env.WORK_ORBIT_PASSWORD}@cluster0.mkuqnbp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const db = client.db("work_orbit_db");

    // Users Collection
    const usersCollection = db.collection("users");

    // All Jobs Collection
    const jobsCollection = db.collection("allJobs");

    // Some Jobs Collection
    const someJobsCollection = db.collection("SomeJobs");

    // My Tasks Collection
    const tasksCollection = db.collection("myTasks");

    // My Added Jobs Collection
    const addedJobsCollection = db.collection("myAddedJobs");

    //  API route for Users Collection
    // Get - Users
    app.get("/users", async (req, res) => {
      // find by email
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const result = await usersCollection.find(query).toArray();
      res.json(result);
    });

    // Post - Users
    app.post("/users", verifyFirebaseToken, async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send("User Already Exist!");
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // -----------------------------------------

    //  API route for All Jobs Collection
    // Get - All Jobs
    app.get("/allJobs", async (req, res) => {
      // find by email
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const result = await jobsCollection
        .find(query)
        .sort({ postedAt: -1 })
        .toArray();
      res.json(result);
    });

    // get job by ID
    app.get("/allJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // Post - All Jobs
    app.post("/allJobs", verifyFirebaseToken, async (req, res) => {
      console.log("header in the post", req.headers);
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // update - all jobs
    app.patch("/allJobs/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updateJob = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          title: updateJob.title,
          category: updateJob.category,
          summary: updateJob.summary,
          coverImage: updateJob.coverImage,
        },
      };
      const option = {};
      const result = await jobsCollection.updateOne(query, update, option);
      res.send(result);
    });

    // delete - all jobs
    app.delete("/allJobs/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // -------------------------

    //  API route for Some Jobs Collection
    // get some jobs
    app.get("/someJobs", async (req, res) => {
      const result = await someJobsCollection
        .find({})
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.json(result);
    });

    // get some job by ID
    app.get("/someJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await someJobsCollection.findOne(query);
      res.send(result);
    });

    // Post
    app.post("/someJobs", verifyFirebaseToken, async (req, res) => {
      const newJob = req.body;
      const result = await someJobsCollection.insertOne(newJob);
      res.send(result);
    });

    // ------------------------------

    //  API route for My Task Collection

    // Get My Task
    // app.get("/myTasks", async (req, res) => {
    //   // find by email
    //   const email = req.query.email;
    //   const query = {};
    //   if (email) {
    //     query.userEmail = email;
    //   }
    //   const result = await tasksCollection.find(query).toArray();
    //   res.json(result);
    // });
    app.get("/myTasks", async (req, res) => {
      const email = req.query.email;
      const query = email ? { workerEmail: email } : {};
      const result = await tasksCollection.find(query).toArray();
      res.json(result);
    });

    // POST accept task
    // app.post("/myTasks", async (req, res) => {
    //   const task = req.body;
    //   const result = await tasksCollection.insertOne(task);
    //   res.send(result);
    // });
    app.post("/myTasks", verifyFirebaseToken, async (req, res) => {
      const task = req.body;

      if (task.workerEmail === task.clientEmail) {
        return res
          .status(400)
          .send({ message: "You cannot accept your own posted job." });
      }

      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    // GET tasks for a user (by acceptedBy query)
    // app.get("/myTasks", async (req, res) => {
    //   const email = req.query.email;
    //   const query = email ? { acceptedBy: email } : {};
    //   const tasks = await tasksCollection.find(query).toArray();
    //   res.send(tasks);
    // });

    // delete - accept task
    app.delete("/myTasks/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tasksCollection.deleteOne(query);
      res.send(result);
    });

    // --------------------------------------
    //  API route for My Added Jobs Collection

    // app.get("/myAddedJobs", async (req, res) => {
    //   const email = req.query.email;
    //   const jobs = await addedJobsCollection
    //     .find({ "postedBy.email": email })
    //     .toArray();
    //   res.send(jobs);
    // });

    // Get All - added Jobs
    app.get("/myAddedJobs", async (req, res) => {
      // find by email
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const result = await addedJobsCollection.find(query).toArray();
      res.json(result);
    });

    // get added Jobs by ID
    app.get("/myAddedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await addedJobsCollection.findOne(query);
      res.send(result);
    });

    // Post - added Jobs
    app.post("/myAddedJobs", verifyFirebaseToken, async (req, res) => {
      console.log("header in the post [My Added Jobs]", req.headers);
      const newJob = req.body;
      const result = await addedJobsCollection.insertOne(newJob);
      res.send(result);
    });

    // update - myAdded Jobs
    app.patch("/myAddedJobs/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updateJob = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          title: updateJob.title,
          category: updateJob.category,
          summary: updateJob.summary,
          coverImage: updateJob.coverImage,
        },
      };
      const option = {};
      const result = await addedJobsCollection.updateOne(query, update, option);
      res.send(result);
    });

    // delete - myAdded Jobs
    app.delete("/myAddedJobs/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedJobsCollection.deleteOne(query);
      res.send(result);
    });

    // app.delete("/myAddedJobs/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };

    //   // Step 1: delete from myAddedJobs collection
    //   const deleteFromAdded = await addedJobsCollection.deleteOne(query);

    //   // Step 2: delete from allJobs collection
    //   const deleteFromAll = await jobsCollection.deleteOne(query);

    //   // Step 3: response পাঠানো
    //   res.send({
    //     myAddedJobsDeleted: deleteFromAdded.deletedCount,
    //     allJobsDeleted: deleteFromAll.deletedCount,
    //   });
    // });

    // await db.command({ ping: 1 });
    console.log("Successfully Ping to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
}
run();

app.get("/", (req, res) => {
  res.send("Hey Jarif! The SERVER is running.");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
