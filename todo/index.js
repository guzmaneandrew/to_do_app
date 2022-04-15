const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const req = require('express/lib/request');
const md5 = require('md5');
const credentials = require('./credentials.js');
const res = require('express/lib/response');

//Setup express
    //An instance of express is created
const app = express();
    //Links http module with Express "package"
const http = require('http').Server(app);
    //Server is started and listens on port 3000 for connections
const port = 3000;
http.listen(port);
console.log(`The server is running on port ${port}.`);

    // Use body-parser to convert our front-end data into JavaScript Objects.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//Custom Values
const tasks = [];
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
    description : String,
    notes : String,
    dueDate : String,
    created : String,
    priority : String,
    deleted : String,
    completed : String,
}
let taskSchema = new mongoose.Schema(taskStructure);
    //Build a model out of out Schema
let taskModel = new mongoose.model("tasks", taskSchema)


//EXPRESS PAGE ROUTES: Routes can have one or more handler functions, which are executed when the route is matched
//Tell our Express server when someone requests nothing, just types in the domain name
app.use("/", express.static("public_html/"));

//POST Handlers (technically also Express routes)
app.post("/createTask", function(request, response){
    
    //get the message data in the request
    let newTask = request.body;

    if(newTask.description === "") {
        let message = {
            message: "Task description cannot be left empty.",
            error: true
        };
        response.send(message);
    } else {
        // //Create ID for newTask
        // let hashData = newTask.description + Date.now();
        // let hash = md5(hashData);
        // newTask.id = hash;
        //Save task to array
        //tasks.push(newTask);

        //Save newTask to database
        let taskObject = new taskModel(newTask);
        taskObject.save(function(error){
            checkError(error, "Successfully saved task to database.");
            
            if(error){
                let message = {
                    message: "Something bad happened saving this task. Contact support.",
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
        console.log(newTask);
    }
});

app.post("/list", function (request, response) {
    taskModel.find({}, function(error, results){
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

app.post("/getTask", function(request, response){
    for(let i = 0; i < tasks.length; i++){
        if (tasks[i].id === request.body.id) {
            response.send(tasks[i]);
        } 
    }
    //Return error message if we don't find it
});

function checkError(error, successMessage){
    if(error){
        console.log(`There was an error: ${error}`);
    } else {
        console.log(successMessage);
    }
}