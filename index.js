require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// ✅ CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.CLIENT_URL || "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ✅ Global database variables
let db, ideasCollection, commentsCollection;

// ✅ Middleware to establish MongoDB connection lazily per request
const connectDb = async (req, res, next) => {
  try {
    if (!db) {
      await client.connect();
      db = client.db("ideavault");
      ideasCollection = db.collection("ideas");
      commentsCollection = db.collection("comments");
      console.log("Connected to MongoDB successfully!");
    }
    next();
  } catch (error) {
    console.error("Database connection failure:", error);
    res.status(500).send({ message: "Database connection error" });
  }
};

// Apply connection middleware to all incoming routes
app.use(connectDb);

// ✅ Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized — no token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).send({ message: "Forbidden — invalid token" });
  }
};

// ============ BASE & HEALTH ROUTES ============
app.get("/", (req, res) => {
  res.send({ message: "IdeaVault API is running" });
});

app.get("/health", (req, res) => {
  res.send({ message: "Server is running perfectly" });
});

// ============ JWT ROUTE ============
app.post("/jwt", (req, res) => {
  try {
    const user = req.body;
    if (!user?.email) {
      return res.status(400).send({ message: "Email is required" });
    }
    const token = jwt.sign(
      { email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.send({ token });
  } catch (error) {
    res.status(500).send({ message: "Failed to generate token" });
  }
});

// ============ COMMENTS ROUTES ============
app.get("/comments/:ideaId", async (req, res) => {
  try {
    const comments = await commentsCollection
      .find({ ideaId: req.params.ideaId })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(comments);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch comments" });
  }
});

app.post("/comments", verifyToken, async (req, res) => {
  try {
    const comment = { ...req.body, createdAt: new Date() };
    const result = await commentsCollection.insertOne(comment);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add comment" });
  }
});

app.patch("/comments/:id", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await commentsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { text, updatedAt: new Date() } },
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update comment" });
  }
});

app.delete("/comments/:id", verifyToken, async (req, res) => {
  try {
    const result = await commentsCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete comment" });
  }
});

app.get("/my-comments", async (req, res) => {
  try {
    const { email } = req.query;
    const comments = await commentsCollection
      .find({ userEmail: email })
      .toArray();
    res.send(comments);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch user comments" });
  }
});

// ============ IDEAS ROUTES ============
app.post("/ideas", verifyToken, async (req, res) => {
  try {
    const idea = { ...req.body, createdAt: new Date() };
    if (
      !idea.title ||
      (!idea.description && !idea.shortDescription && !idea.detailedDescription)
    ) {
      return res
        .status(400)
        .send({ message: "Title and description are required" });
    }
    const result = await ideasCollection.insertOne(idea);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create idea" });
  }
});

app.get("/my-ideas", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    const ideas = await ideasCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(ideas);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch your ideas" });
  }
});

app.get("/ideas", async (req, res) => {
  try {
    const { search, category, limit } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category) {
      query.category = category;
    }

    let cursor = ideasCollection.find(query).sort({ createdAt: -1 });

    if (limit) {
      cursor = cursor.limit(parseInt(limit));
    }

    const ideas = await cursor.toArray();
    res.send(ideas);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch ideas" });
  }
});

app.get("/ideas/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID format" });
    }
    const idea = await ideasCollection.findOne({ _id: new ObjectId(id) });
    if (!idea) {
      return res.status(404).send({ message: "Idea not found" });
    }
    res.send(idea);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to fetch idea", error: error.message });
  }
});

app.put("/ideas/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID format" });
    }
    const updatedIdea = req.body;
    const result = await ideasCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedIdea },
    );
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Idea not found" });
    }
    res.send(result);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to update idea", error: error.message });
  }
});

app.delete("/ideas/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid ID format" });
    }
    const result = await ideasCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Idea not found" });
    }
    res.send(result);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to delete idea", error: error.message });
  }
});

module.exports = app;
