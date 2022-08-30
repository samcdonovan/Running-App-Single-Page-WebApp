/* required modules for this app */
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql');
const fileUpload = require('express-fileupload');
const { response } = require('express');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(fileUpload());

app.use(
    session({
        secret: 'cst2120 secret',
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: true
    })
);

/* SQL connection pool setup */
const connectionPool = mysql.createPool({
    connectionLimit: 1,
    host: "localhost",
    user: "root",
    password: "",
    database: "maindb",
    debug: false
});

/* get request function configuration */
app.get('/signOut', signOut); /* signs the user out */
app.get('/users/*', checkLogin); /* checks whether a user is logged in or not */
app.get('/exercises', timelineHelper); /* gets the timeline/all exercises */

/* post request function configuration */
app.post('/comments', getComments); /* gets all of the comments for an exercise */
app.post('/users', register); /* adds a new user */
app.post('/login', login); /* logs the user in */
app.post('/exercises', insertExercise); /* uploads an exercise to the database */
app.post('/writeComment', uploadComment); /* uploads a comment to the database */

/* 
Main upload function, used to upload images to the database
Called when an AJAX post request is made from /uploads
*/
app.post("/uploads", function (request, response) {

    if (!request.files || Object.keys(request.files).length === 0) {
        return response.status(400).send('{"upload": false, "error": "Files missing"}');
    }

    /* get current local time and date, used to create a unique file name */
    let current = new Date();
    let currentDate = current.toLocaleDateString().replaceAll("/", "");
    let currentTime = current.toLocaleTimeString().replaceAll(":", "");

    // The name of the input field (i.e. "myFile") is used to retrieve the uploaded file
    let myFile = request.files.myFile;

    /* if the user has not uploaded any images, set the image to a default image */
    if (myFile.name == ".public/images/noimage.png") {
        response.send('{"filepath": "../images/' + myFile.name + '", "upload": true}');
        return;
    }

    let fileExtension = myFile.name.substring(myFile.name.lastIndexOf("."), myFile.name.length);

    /* check that the file extension is valid */
    if (fileExtension !== ".png" && fileExtension !== ".jpg" && fileExtension !== ".jpeg") {
        response.send('{"error": "Invalid file type: ' + fileExtension + '", "upload": false}');
        return;
    }
    /* if the user is logged in, change the file name to their name plus the current date and time
    This is to ensure that the file names are unique. */
    if (request.session.loggedInUser !== undefined) {
        myFile.name = request.session.loggedInUser.fullName + request.session.loggedInUser.id
            + currentDate + currentTime + fileExtension;
    } else {
        /* otherwise, set the file name to the current date and time */
        myFile.name = currentDate + currentTime + fileExtension;
    }

    /* Use the mv() method to place the file in the folder called 'images' on the server.
        This is in the current directory */
    myFile.mv('./public/images/' + myFile.name, function (err) {
        if (err)
            return response.status(500).send('{"filename": "' +
                myFile.name + '", "upload": false, "error": "' +
                JSON.stringify(err) + '"}');

        /* send back the filepath of the image to the post request */
        response.send('{"filepath": "../images/' + myFile.name + '", "upload": true}');
    });
});

app.listen(8080); /* start the app listening on port 8080 */

/*
Main signout function, called when an AJAX get request is called on /signOut
*/
function signOut(request, response) {

    /* destroy the session and respond with success unless there is an error */
    request.session.destroy(err => {
        if (err) {
            response.send('{"success": false, "error": ' + JSON.stringify(err) + '}');
        }
        else {
            response.send('{"success": true}');
        }
    });
}

/*
Helper function to check if a user is logged in the current session
Called when an AJAX get request is called from /users/*
*/
function checkLogin(request, response) {

    if (request.session.loggedInUser != undefined) {
        response.send(JSON.stringify(request.session.loggedInUser));
    } else {
        response.send('{"success": false}');
    }
}

/*
Asynchronous helper function to update an exercise with the full name 
and picture of the user that uploaded the exercise.
Called in the userIDHelper() function
*/
async function userIDQuery(exerciseObj) {

    /* SQL query to find the user with the user id associated with input exercise */
    userQuery = "SELECT firstName, surname, profilePic FROM users WHERE id=" + exerciseObj.userId;

    return new Promise((resolve, reject) => {
        connectionPool.query(userQuery, (err, user) => {

            if (err) {
                console.error("Error executing query: " + JSON.stringify(err));
                reject(err);
            } else {
                /* get the full name and profile pic from the SQL query, and insert them
                into the exercise object that was passed into the function */
                exerciseObj.fullName = user[0].firstName + " " + user[0].surname;
                exerciseObj.profilePic = user[0].profilePic;

                /* resolve the updated exercise object */
                resolve(exerciseObj);
            }
        });
    });
}

/*
Asynchronous helper function to loop through all of the exercises in the database
Updates each exercise with the full name and profile pic of the user.
Called in the getTimeline() function
*/
async function userIDHelper(result) {
    for (let i = 0; i < result.length; i++) {
        /* wait for userIDQuery to run on the current exercise and then set 
        that exercise to an updated version with the full name and picture of the user */
        result[i] = await userIDQuery(result[i]);

    }
    return result; /* return updated exercises */
}

/*
Asynchronous function that retrieves an array from the database 
consisting of all exercises in the database.
Called in the timelineHelper() function
*/
async function getTimeline() {

    /* search for all exercises in SQL database 
    and order them by the order they were added to the database */
    let exerciseQuery = "SELECT * FROM exercises" +
        "       ORDER BY id DESC";

    //Wrap the execution of the query in a promise
    let newPromise = new Promise(function (resolve, reject) {

        /* run exercise query on SQL database */
        connectionPool.query(exerciseQuery, (err, result) => {
            if (err) {
                reject(err);
            } else {
                /* resolve the result of the query, a JSON containing all of the exercises */
                resolve(result);
            }
        });
    });
    try {
        /* await for the promise to run and then await for userIDHelper to run */
        let exercise = await newPromise;

        /* userIDHelper will update every exercise with the full name
         and picture of the user that uploaded that exercise */
        let updatedExercise = await userIDHelper(exercise);

        return updatedExercise;
    }
    catch (err) {
        console.log("Error: " + JSON.stringify(err));
    }
}

/*
Helper function used to wait for the async function getTimeline() to run, 
and then respond with the result from that function.
Called when an AJAX get request is called from /exercises
*/
function timelineHelper(request, response) {
    getTimeline().then(result => {

        response.send(result);
    }).catch(err => {//Handle the error
        console.error(JSON.stringify(err));
    });
}

/*
Main function to get all of the comments in the database.
Called when an AJAX post request is called from /comments
*/
function getComments(request, response) {
    let exerciseID = request.body.id;

    let outputArray = "[";

    /* search query to search the databae for all comments with the input exercise id */
    let commentQuery = "SELECT * FROM comments WHERE exerciseId=" + exerciseID +
        "       ORDER BY id DESC";

    let userQuery;
    let fullName;

    /* execute the comment query on the SQL database */
    connectionPool.query(commentQuery, (err, commentResult) => {
        if (err) {
            response.send('{"success": false, "error": ' + JSON.stringify(err) + '}');
        } else if (commentResult[0] != null) {

            /* if there are comments for the posted exercise, 
            loop through and retrieve user data from the user that posted the comment */
            for (let i = 0; i < commentResult.length; i++) {

                /* for every comment, build a search queary on the users table, based on the user id of the comment */
                userQuery = "SELECT firstName, surname, profilePic FROM users WHERE id=" + commentResult[i].userId;

                /* run user query on SQL database */
                connectionPool.query(userQuery, (err, userResult) => {
                    if (err) {
                        console.error("Error executing query: " + JSON.stringify(err));
                    } else {
                        fullName = userResult[0].firstName + " " + userResult[0].surname;

                        /* add current user and their comment to the output JSON */
                        outputArray += '{"id": ' + commentResult[i].id + ', "fullName": "' + fullName + '", "profilePic": "' +
                            userResult[0].profilePic + '", "comment": "' + commentResult[i].comment + '", "date": "' +
                            commentResult[i].date + '", "time": "' + commentResult[i].time + '"}';

                        if (i != commentResult.length - 1) {
                            outputArray += ", ";
                        }
                    }
                    if (i == commentResult.length - 1) {
                        /* if the loop is on the last comment, close the JSON string and send it to the response */
                        outputArray += "]";

                        response.send(outputArray);
                    }
                });
            }
        } else {
            response.send('{"success": false, "error": "None found"}');
        }
    });
}

/*
Main function called when the user registers an account
Called when an AJAX post request is made to /users
*/
function register(request, response) {
    let newUser = request.body;

    /* check that none of the user entered data is empty */
    if (newUser.firstName == "" || newUser.surname == "" || newUser.email == "" || newUser.password == "") {
        response.send('{"success": false, "error": "empty fields"}');

    } else {

        /* search for a user with the inputted email */
        let sqlQuery = "SELECT * FROM users WHERE email='" + newUser.email + "'";

        /* run the query on the SQL database */
        connectionPool.query(sqlQuery, (err, result) => {

            if (err) {
                console.error("Error executing query: " + JSON.stringify(err));
            } else if (result[0] != null) {

                /* if the result is not empty, respond with failure */
                response.send('{"success": false, "error": "' + newUser.email + ' already exists."}');
            } else {

                /* if the email does not exist in the database build an insert based on the form data */
                let sqlInsert = "INSERT INTO users (firstName, surname, email, password, profilePic) " +
                    "       VALUES ('" + newUser.firstName + "','" + newUser.surname + "','"
                    + newUser.email + "', '" + newUser.password + "', '" + newUser.image + "')";

                /* execute the SQL insert on the database */
                connectionPool.query(sqlInsert, (err, result) => {
                    /* respond with true or false based on if the insert worked correctly */
                    if (err) {
                        response.send('{"success": false, "error": "' + JSON.stringify(err) + '"}');
                    } else {
                        response.send('{"success": true}');
                    }
                });
            }
        });
    }
}

/*
Main login function, checks the database to see if entered email and password are correct.
If so, it sends the users details back to the AJAX request.
Called when an AJAX post request is called from /login
*/
function login(request, response) {
    let usrLogin = request.body;

    let sqlQuery = "SELECT * FROM users WHERE email='" + usrLogin.email + "' AND password='" + usrLogin.password + "'";

    let jsonObj;

    /* open connection pool to find correct user */
    connectionPool.query(sqlQuery, (err, result) => {
        if (err) {
            console.error("Error executing query: " + JSON.stringify(err));
        } else if (result[0] != null) {

            /* user object to respond with */
            jsonObj = {
                id: result[0].id,
                fullName: result[0].firstName + " " + result[0].surname,
                profilePic: result[0].profilePic,
                success: true
            };

            request.session.loggedInUser = jsonObj;

            response.send(JSON.stringify(jsonObj));
        } else {
            /* if the user does not exist, a json object with 
            a success check is sent back to the AJAX request */
            response.send('{"success": false }');
        }
    });
}

/*
Main function used to insert an exercise into the database
Called when an AJAX post request is called from /exercises
*/
function insertExercise(request, response) {

    let newExercise = request.body;

    /* build insert based on user inputted data */
    let sqlInsert = "INSERT INTO exercises (userId, title, description, date, currentTime, elapsedTime, distance, image) " +
        "       VALUES (" + newExercise.userId + ", '" + newExercise.title + "', '" + newExercise.description + "', '" +
        newExercise.date + "', '" + newExercise.currentTime + "', '" + newExercise.elapsedTime + "', '" + newExercise.distance +
        "', '" + newExercise.image + "')";

    /* execute insert and responsd with either success or failure */
    connectionPool.query(sqlInsert, (err, result) => {
        if (err) {
            response.send('{"success": false, "error": ' + JSON.stringify(err) + '}');
        } else {
            response.send('{"success": true }');
        }
    });
}

/*
Main function to upload a comment to the database 
Called when an AJAX post request is made to /writeComment
*/
function uploadComment(request, response) {
    let commentObj = request.body;
    commentObj.userId = request.session.loggedInUser.id; /* get user id from comment */

    /* get current local date and time */
    let current = new Date();
    let currentDate = current.toLocaleDateString();
    let currentTime = current.toLocaleTimeString();

    /* build SQL comment insert with relevant comment information */
    let sqlInsert = "INSERT INTO comments (userId, exerciseId, comment, date, time) " +
        "       VALUES ('" + commentObj.userId + "','" + commentObj.id + "','"
        + commentObj.comment + "', '" + currentDate + "', '" + currentTime + "')";

    /* execute comment insert on SQL database */
    connectionPool.query(sqlInsert, (err, result) => {
        /* respond with either success or failure after insert */
        if (err) {
            console.error('{"success": false, "error": ' + JSON.stringify(err) + '}');
        } else {
            response.send('{"success": true}');
        }
    });
}
