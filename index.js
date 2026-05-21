const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())
const port = 4000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri =


  'mongodb+srv://prachir23:Ce7Pweq13vWzlGza@cluster0.dp9wgxi.mongodb.net/?appName=Cluster0'

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})
async function run () {
  try {
    await client.connect()
    const db = client.db('ideavault')
    const destinationCollection = db.collection('ideas')
    // Connect the client to the server	(optional starting in v4.7)

    app.post('/ideas', async (req, res) => {
      const idea = req.body
      const result = await destinationCollection.insertOne(idea)
      res.send(result)
    })

    app.get('/ideas', async (req, res) => {
      const ideas = await destinationCollection.find({}).toArray()
      res.send(ideas)
    })

    app.get('/ideas/:id', async (req, res) => {
      const id = req.params.id
      const idea = await destinationCollection.findOne({
        _id: new ObjectId(id)
      })
      res.send(idea)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close()
  }
}
run().catch(console.dir)
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
