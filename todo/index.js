const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const req = require("express/lib/request");
const credentials = require("./credentials.js");
const md5 = require("md5");
const session = require("express-session");

//Setup express
const app = express();
const http = require('http').Server(app);
const port = 3000;
http.listen(port);
console.log(`The server is running on port ${port}.`);

// Use body-parser to convert our front-end data into JavaScript Objects.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//Session setup
app.use(session({
    secret: 'keyboard dog',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
}));

//Custom Values
//const tasks = []; no longer using this, moved to database
const dbUrl = credentials.dbUrl;

//Setup mongoose
    //Mongoose settings/options
const mongooseOptions = {
    useNewUrlParser:  true,
    useUnifiedTopology: true
};
    //Create connection
mongoose.connect(dbUrl, mongooseOptions, function(error){
    checkError(error, "Successfully connected to MongoDB.");  
});

    //"Links" MongoDB errors to console
let db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB Error: "));

    //Tell mongoose what a JS promise is
mongoose.Promise = global.Promise;

//Setup MongoDB
    //Create a MongoDB Schema
const taskStructure = {
    owner: mongoose.ObjectId,
    description: String,
    notes: String,
    dueDate: String,
    created: String,
    priority: String,
    completed: String,
    //deleted/completed: String
};
let taskSchema = new mongoose.Schema(taskStructure);
    //Build a model out of our Schema
let taskModel = new mongoose.model("tasks", taskSchema);

let userStructure = {
    username: String,
    password: String,
    email: String,
    salt: String
}

let userSchema = new mongoose.Schema(userStructure);
let userModel = new mongoose.model("users", userSchema);

//EXPRESS PAGE ROUTES: Routes can have one or more handler functions, which are executed when the route is matched
//Tell our Express server when someone requests nothing, just types in the domain name
app.use("/", express.static("public_html/"));

//POST Handlers
app.post("/userSession", function(request, response) { 
    
    const userDetails = request.body;

    if (userDetails.type === "login") {

        const userQuery = {
            username: userDetails.username,
            password: md5(userDetails.password)
        }

        userModel.find(userQuery, function(error, results) {

            if (results.length === 1) {
                request.session.username = userDetails.username;
                request.session.loggedIn = true;
                request.session.dbId = results[0]._id;

                response.send({
                    username: userDetails.username,
                    message: ""
                });
            } else {
                response.send({
                    username: null,
                    message: "Sorry, but the username or password is wrong. Try again."
                });
            }  
        });
    } else if (userDetails.type === "create-account") {

        const newUser = {
            username: userDetails.username,
            password: md5(userDetails.password)
        }

        if(newUser.username === "" || newUser.password === "d41d8cd98f00b204e9800998ecf8427e") {
            let message = {
                message: "Please enter username and password to create an account.",
                error: true
            };
            response.send(message);
        } else {    
            //Save newTask to database
            let userObject = new userModel(newUser);

            userModel.find({username: userDetails.username}, function(error, results){

                if (typeof results[0] !== "undefined") {

                    let message = {
                        message: "An account with this username already exists.",
                        error: true
                    };
                    response.send(message);   

                } else {

                    userObject.save(function(error){
                        checkError(error, "Successfully created new account and saved new user to database.");
                        
                        if(error){
                            let message = {
                                message: "An error occured while attempting to create a new account.",
                                error: true
                            };
            
                            response.send(message);
                        } else {
                            let message = {
                                message: "Account created succcessfully.",
                                error: false
                            };
            
                            response.send(message);
                        }
                    });
                }
            });


            // userObject.save(function(error){
            //     checkError(error, "Successfully created new account and saved new user to database.");
                
            //     if(error){
            //         let message = {
            //             message: "An error occured while attempting to create a new account.",
            //             error: true
            //         };
    
            //         response.send(message);
            //     } else {
            //         let message = {
            //             message: "Account created succcessfully.",
            //             error: false
            //         };
    
            //         response.send(message);
            //     }
            // });
        }

    } else if (userDetails.type === "logout") {

        request.session.loggedIn = false;
        request.session.destroy();
        response.send({});

    } else if (userDetails.type === "continue") {

        //console.log(userDetails);

        if (request.session.loggedIn === true ) {
            response.send({username: request.session.username, message: ""});
        } else {
            response.send({message: null});
        }
    }
});

app.post("/createTask", function(request, response) {
    
    //get the message data in the request
    let newTask = request.body;

    if(newTask.description === "") {
        let message = {
            message: "Task description cannot be left empty.",
            error: true
        };
        response.send(message);
    } else {
        //console.log(request.session);
        newTask.owner = request.session.dbId;

        //Save newTask to database
        let taskObject = new taskModel(newTask);

        taskObject.save(function(error){
            checkError(error, "Successfully saved task to database.");
            
            if(error){
                let message = {
                    message: "An error occured while attempting to save this task.",
                    error: true
                };

                response.send(message);
            } else {
                let message = {
                    message: "Task saved successfully!",
                    error: false
                };

                response.send(message);
            }
        });
        //console.log(newTask);
    }
});

app.post("/list", function(request, response) {
    //console.log("dbId: " + request.session.dbId);
    taskModel.find({owner: request.session.dbId}, function(error, results){

        checkError(error, "Successfully received tasks from database.");

        if(error) {
            let responseObject = {
                list: []
            }

            response.send(responseObject);
        }
        else {
            let responseObject = {
                list: results
            }

            response.send(responseObject);
        }
    });
});

app.post("/getTask", function(request, response) {

    taskModel.find({owner: request.session.dbId, _id: request.body.id}, function(error, results){

        checkError(error, "Successfully searched documents.");
        
        response.send(results[0]);
    });

    // for(let i = 0; i < tasks.length; i++){
    //     if (tasks[i]._id === request.body._id) {
    //         response.send(tasks[i]);
    //     } 
    // }
    //Return error message if we don't find it
});

app.post("/deleteTask", function(request, response) {
    taskModel.findByIdAndRemove({owner: request.session.dbId, _id: request.body._id}, function(error, results) {
        checkError(error, "Successfully searched documents.");
        
        let objectToSend = {
            success: true,
            oldCopy: results
        };

        response.send(objectToSend);
    });
});

// app.post("/completeTask", function(request, response) {

//     let taskId = request.body._id;

//     taskModel.findByIdAndUpdate({owner: request.session.dbId, _id: taskId}, {completed: "true"}, function(error, results) {

//         checkError(error, "Completed a task and successfully updated a document.");
        
//         if(error) {
//             response.send({success: false});
//         } else {
//             response.send({success: true});
//         }
//     });
// });

app.post("/updateTask", function(request, response) {
    let taskId = request.body._id;
    
    //We could delete _id in request object
    let updates = {
        notes: request.body.notes,
        description: request.body.description,
        priority: request.body.priority,
        dueDate: request.body.dueDate,
        created: request.body.created
    };

    taskModel.findByIdAndUpdate({owner: request.session.dbId, _id: taskId}, updates, function(error, results) {
        checkError(error, "Successfully updated a document.");
        
        if(error) {
            response.send({success: false});
        } else {
            response.send({success: true});
        }
    });
});

function checkError(error, successMessage){
    if(error){
        console.log(`There was an error: ${error}`);
    } else {
        console.log(successMessage);
    }
}