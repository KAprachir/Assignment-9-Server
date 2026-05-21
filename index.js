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

    // CREATE - Post a new idea
    app.post('/ideas', async (req, res) => {
      try {
        const idea = req.body
        if (!idea.title || !idea.description) {
          return res.status(400).send({ message: 'Title and description are required' })
        }
        const result = await ideasCollection.insertOne(idea)
        res.send(result)
      } catch (error) {
        res.status(500).send({ message: 'Failed to create idea', error: error.message })
      }
    })

    // READ - Get all ideas
    app.get('/ideas', async (req, res) => {
      try {
        const ideas = await ideasCollection.find({}).toArray()
        res.send(ideas)
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch ideas', error: error.message })
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
