const mongoose =require ("mongoose")

async function connectToMongoose(url) {
    mongoose.connect(url , {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
}

module.exports={connectToMongoose}