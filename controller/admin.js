
const { validationResult } = require('express-validator')
const taskSchema = require('../models/task')
const userSchema = require('../models/users')
const fileSchema = require('../models/tasksFile')
const nodeMailer = require('nodemailer')
const path = require('path')
const fs = require('fs')

exports.getTasks = (req, res, next) => {
    const currentPage = req.query.page,
        limit = req.query.limit;
    let totalItems;
    taskSchema.find(res.locals.filter).countDocuments().then(search => {
        totalItems = search;
        return taskSchema.find(res.locals.filter).populate("userId").skip((currentPage - 1) * limit).limit(limit).sort({ updatedAt: -1 })
    }).then(result => {
        if (!result) {
            const error = new Error("No Tasks Found")
            error.statusCode = 200;
            throw error
        } else {
            res.status(200).json({
                tasks: result,
                totalItems: totalItems
            })
        }
    }).catch(err => {
        const error = new Error("No Tasks Found")
        error.statusCode = 400
        throw error
    })
}

exports.createTask = (req, res, next) => {
    async function taskNotification (email,name,title,deadline){
        const transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user:'yassineelkarimi049@gmail.com',
                pass:'dhxanwuauhtqjcir'
            }
        });
        
        const info = await transporter.sendMail({
            from:'yassineelkarimi049@gmail.com',
            to: email,
            subject : 'New Task',
            html: ` <h1>Hello ${name}</h1>
                    <p>You have a new task to do, check your account please !</p>
                    <h3>Task title : ${title}</h3>
                    <h3>Deadline : <font color="red">${deadline}</font></h3>
            `,
        });
        
    }
    const err = validationResult(req);
    if (!err.isEmpty()) {
        return res.status(400).json({
            massage: "title invalid",
            errors: err.array()
        })
    }
    const imageUrl = req.file.path;
    let usersIds = req.body.userId;
    let usersIdsArr = [];
    usersIds.split(',').map(string => usersIdsArr.push(string));
    const postTask = new taskSchema({
        title: req.body.title,
        userId: usersIdsArr,
        image: imageUrl,
        description: req.body.description,
        deadline: req.body.deadline,
    })
    postTask.save().then(() => {
        let usersIds = req.body.userId;
        usersIds.split(',').map(id => userSchema.findByIdAndUpdate(id).then(user => {
            //email
            console.log(user.email,user.username);
            user.assignedTasks = ++user.assignedTasks
            user.save();
            taskNotification(user.email,user.username,req.body.title,req.body.deadline).catch(e=>{
                console.log(e);
            })
        }));
        res.status(201).json({
            massage: "Task Created Successfully"
        })
    }).catch(err => {
        throw err
    })
}

exports.deleteTask = (req, res, next) => {
    taskSchema.findById(req.params.id).then(result => {
        if (!result) {
            let error = new Error("No Task Found With This ID...")
            error.statusCode = 404;
            throw error
        }
    }).then( () => {
        taskSchema.findByIdAndRemove(req.params.id).then(result => {
           let ids = result.userId.toString() ;
           ids.split(',').map(id =>  userSchema.findByIdAndUpdate(id).then(user => {
            if(user.assignedTasks > 0) {
                user.assignedTasks = --user.assignedTasks
                user.save().then( () => {
                res.status(200).json({ massage:"Task deleted Successfully" })
            })
            } else {
                user.assignedTasks = 0;
            }
            }))
        })
    })

}

exports.editTask = (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        return res.status(400).json({
            massage: "title invalid",
            errors: err.array()
        })
    }
    let usersIds = req.body.userId;
    let usersIdsArr = [];
    usersIds.split(',').map(string => usersIdsArr.push(string));
    const title = req.body.title;
    const description = req.body.description;
    const deadline = req.body.deadline;
    const userId = usersIdsArr;
    let image = req.body.image
    if (req.file) {
        image = req.file.path
    }
    if (!image) {
        let error = new Error("No Image Uploaded")
        error.statusCode = 422;
        throw error
    }
    taskSchema.findByIdAndUpdate(req.params.id).then(result => {
        if (!result) {
            let error = new Error("No Task Found With This ID...")
            error.statusCode = 404;
            throw error
        }
        result.title = title;
        result.description = description;
        result.deadline = deadline;
        result.userId = userId;
        result.image = image;
        return result.save()
    }).then(status => {
        res.status(200).json({
            massage: "Task Updated Successfully"
        })

    }).catch(err => {
        throw err
    })
}

exports.getUserTasks = (req , res , next) => {
    userId =  req.params.id;
    taskSchema.find({userId:userId}).then(result => {
        if(!result) {
            let error = new Error("No Tasks Found Assgined To This ID...")
            error.statusCode = 400;
            throw error
        }
        res.status(200).json({ tasks: result });
    }).catch(err => {
        next(err);
    })
}

// exports.getUserTasks = (req , res , next) => {
//     const currentPage = req.query.page,
//           limit = req.query.limit,
//           status = req.query.status
//     userId =  req.params.id;
//     console.log(userId);
//     taskSchema.find({userId:userId}).then(result => {
//         console.log(result);
//     })
//    taskSchema.find({userId: userId , status:status}).countDocuments().then(result => {
//         if (!result) {
//             let error = new Error("No Tasks Found Assgined To This ID...")
//             error.statusCode = 400;
//             throw error
//         }
//         totalItems = result;
//         return taskSchema.find({userId:req.userData.userId, status:status}).skip((currentPage - 1) * limit).limit(limit).sort({ updatedAt: -1 })
//     }).then(status => {
        
//         res.status(200).json({ tasks: status })
       
//     }).catch(err => {
//         next(err)
//     })
// }

exports.taskDetails = (req , res , next) => {
    const taskId = req.params.id;
   
    taskSchema.findById(taskId).then(result => {
        if (!result) {
            let error = new Error("No Task Found With This ID...")
            error.statusCode = 400;
            throw error
        }
        return result
    }).then(status => {
        
        res.status(200).json({ tasks: status })
       
    }).catch(err => {
        next(err)
    })
}

exports.completeTask = (req , res , next) => {
    let taskId = req.body.id;
    taskSchema.findByIdAndUpdate(taskId).then(result => {
        if (!result) {
            let error = new Error("No Task Found With This ID...")
            error.statusCode = 400;
            throw error
        }
        result.status = "Complete"
        result.save().then(() => {
            userSchema.findByIdAndUpdate(result.userId).then(user => {
                user.save().then(() => {
                    res.status(200).json({ massage:"Task Complete Successfully" })
                })
            })
        })
    })
}

exports.uploadFile = (req , res , next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) {
        return res.status(400).json({
            massage: "file is invalid",
            errors: err.array()
        })
    }
    const FileUrl = req.file.path;
    const file = new fileSchema({
        userId: req.body.userId,
        file: FileUrl,
        description: req.body.description,
    })
    file.save().then(() => {
        res.status(201).json({
            massage: "File uploaded Successfully"
        })
        }).catch(err => {
            throw err
        })
}


