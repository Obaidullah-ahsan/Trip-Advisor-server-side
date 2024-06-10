const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["https://trip-advisor11.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zkk0rbw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send("unauthorized access");
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send("unauthorized access");
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const packagesCollection = client
      .db("tripAdvisorDB")
      .collection("packages");
    const guidesCollection = client.db("tripAdvisorDB").collection("guides");
    const reviewCollection = client.db("tripAdvisorDB").collection("reviews");
    const userCollection = client.db("tripAdvisorDB").collection("users");
    const wishlistCollection = client
      .db("tripAdvisorDB")
      .collection("wishlist");
    const storyCollection = client.db("tripAdvisorDB").collection("story");
    const bookingCollection = client.db("tripAdvisorDB").collection("bookings");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // users related api
    app.get("/users", verifyToken, async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      let searchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
      if (filter) {
        searchQuery = {
          ...searchQuery,
          role: { $regex: filter, $options: "i" },
        };
      }
      const result = await userCollection.find(searchQuery).toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/changeRole/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Verified",
          role,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/requestToBeGuide/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Requested",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ Message: "User already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Bookings related api
    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingsItem = req.body;
      const result = await bookingCollection.insertOne(bookingsItem);
      res.send(result);
    });

    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { tourist_email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/guideAssignedBookings/:name", verifyToken, async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const query = { guide_name: name };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/deleteBookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // pckages related api
    app.get("/packages", async (req, res) => {
      const result = await packagesCollection.find().toArray();
      res.send(result);
    });

    app.get("/packages/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packagesCollection.findOne(query);
      res.send(result);
    });

    app.get("/categoryBasePackages/:category", async (req, res) => {
      const category = req.params.category;
      const query = { tour_type: category };
      const result = await packagesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/packages", async (req, res) => {
      const packageItem = req.body;
      const result = await packagesCollection.insertOne(packageItem);
      res.send(result);
    });

    // guides related api
    app.get("/guides", async (req, res) => {
      const result = await guidesCollection.find().toArray();
      res.send(result);
    });

    app.get("/guides/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await guidesCollection.findOne(query);
      res.send(result);
    });

    app.post("/guides", async (req, res) => {
      const guideInfo = req.body;
      const result = await guidesCollection.insertOne(guideInfo);
      res.send(result);
    });

    // reviews related api
    app.get("/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { guide_email: email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // Wishlist related api

    app.get("/wishlist/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/wishlist", verifyToken, async (req, res) => {
      const wishlist = req.body;
      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
    });

    app.delete("/wishlist/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // Story related api
    app.get("/story", async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });

    app.get("/story/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await storyCollection.findOne(query);
      res.send(result);
    });

    app.post("/story", async (req, res) => {
      const storyItem = req.body;
      const result = await storyCollection.insertOne(storyItem);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("TripAdvisor is Running");
});

app.listen(port, () => {
  console.log(`TripAdvisor is running on port ${port}`);
});
