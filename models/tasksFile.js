const mongoose = require('mongoose');
const schema = mongoose.Schema;

const taskFile = new schema({
    
    userId : {
        type:schema.Types.ObjectId,
        required:true,
        ref:'User'
    },
    file:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    uploadDate:{
        type: Date,
        default: Date.now()
    }
},{timestamps:true})

module.exports = mongoose.model('TaskFile' , taskFile)