require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const app = express()
const port = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ]
}))
app.use(express.json())

// MongoDB connection
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function run() {
  try {
    await client.connect()
    console.log('Pinged your deployment. You successfully connected to MongoDB!')

    const db = client.db('ideavault')
    const ideasCollection = db.collection('ideas')
    const commentsCollection = db.collection('comments')

    // GET comments for an idea
    app.get('/comments/:ideaId', async (req, res) => {
      try {
        const comments = await commentsCollection
          .find({ ideaId: req.params.ideaId })
          .sort({ createdAt: -1 })
          .toArray()
        res.send(comments)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch comments' })
      }
    })

    // POST a comment
    app.post('/comments', async (req, res) => {
      try {
        const comment = {
          ...req.body,
          createdAt: new Date()
        }
        const result = await commentsCollection.insertOne(comment)
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to add comment' })
      }
    })

    // PATCH (edit) a comment — only owner can edit
    app.patch('/comments/:id', async (req, res) => {
      try {
        const { text } = req.body
        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { text, updatedAt: new Date() } }
        )
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to update comment' })
      }
    })

    // DELETE a comment
    app.delete('/comments/:id', async (req, res) => {
      try {
        const result = await commentsCollection.deleteOne({
          _id: new ObjectId(req.params.id)
        })
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete comment' })
      }
    })

    // GET comments by user email (for My Interactions page)
    app.get('/my-comments', async (req, res) => {
      try {
        const { email } = req.query
        const comments = await commentsCollection
          .find({ userEmail: email })
          .toArray()
        res.send(comments)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch user comments' })
      }
    })

    // CREATE - Post a new idea
    app.post('/ideas', async (req, res) => {
      try {
        const idea = {
          ...req.body,
          createdAt: new Date()
        }
        if (!idea.title || !idea.description) {
          return res.status(400).send({ message: 'Title and description are required' })
        }
        const result = await ideasCollection.insertOne(idea)
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to create idea' })
      }
    })

    // Add this new route — GET my ideas by email
    app.get('/my-ideas', async (req, res) => {
      try {
        const { email } = req.query
        const ideas = await ideasCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray()
        res.send(ideas)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch your ideas' })
      }
    })
    // READ - Get all ideas
    app.get('/ideas', async (req, res) => {
      try {
        const { search, category, limit } = req.query
        let query = {}

        if (search) {
          query.title = { $regex: search, $options: 'i' }
        }
        if (category) {
          query.category = category
        }

        let cursor = ideasCollection.find(query).sort({ createdAt: -1 })

        if (limit) {
          cursor = cursor.limit(parseInt(limit))
        }

        const ideas = await cursor.toArray()
        res.send(ideas)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch ideas' })
      }
    })

    // READ - Get a single idea by ID
    app.get('/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' })
        }
        const idea = await ideasCollection.findOne({ _id: new ObjectId(id) })
        if (!idea) {
          return res.status(404).send({ message: 'Idea not found' })
        }
        res.send(idea)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch idea', error: error.message })
      }
    })

    // UPDATE - Update an idea by ID
    app.put('/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' })
        }
        const updatedIdea = req.body
        const result = await ideasCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedIdea }
        )
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Idea not found' })
        }
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to update idea', error: error.message })
      }
    })

    // DELETE - Delete an idea by ID
    app.delete('/ideas/:id', async (req, res) => {
      try {
        const id = req.params.id
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' })
        }
        const result = await ideasCollection.deleteOne({ _id: new ObjectId(id) })
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Idea not found' })
        }
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete idea', error: error.message })
      }
    })

  } finally {
    // await client.close()
  }
}

run().catch(console.dir)

app.listen(port, () => {
  console.log(`IdeaVault server listening on port ${port}`)
})
