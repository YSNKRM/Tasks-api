const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const DBConcction = callback => { mongoose.connect(process.env.MONGO_URL).then( ()=> {
         console.log("DB Connected!!")
         callback()
    }).catch(err => {
        console.log(err);
    })
}

exports.DBConcction = DBConcction;