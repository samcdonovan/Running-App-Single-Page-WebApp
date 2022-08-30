
window.onload = initialise();

/*
Function that is called when the window has loaded.
Checks if the user is logged in and loads the timeline 
*/
function initialise() {

    clientCheckLogin();
    clientGetTimeline();

}


/*-------------------Hide Display Functions---------------*/

/*
Function that displays the exercise tab when pressed
*/
function exerciseButton() {
    /* if the main body is not hidden, hide it and show the exercise tab */
    if (!document.getElementById("mainBody").classList.contains("hide")) {
        document.getElementById("mainBody").classList.toggle("hide");
        document.getElementById("exerciseTab").classList.toggle("hide");
    }

    document.getElementById("timeline").innerHTML = "";

    /* run the asynchronous check login function */
    asyncCheckLogin().then(result => {

        /* if the user is not logged in, hide the start exercise div and show the not logged in div.
        this effectively stops the user from recording an exercise unless they are logged in */
        if (result == false) {
            if (!document.getElementById("startExercise").classList.contains("hide")) {
                document.getElementById("startExercise").classList.toggle("hide");
            }
            if (document.getElementById("notLoggedInExercise").classList.contains("hide")) {
                document.getElementById("notLoggedInExercise").classList.toggle("hide");
            }
        } else {
            /* if the user is logged in, show the start exercise div, allowing the user to start an exercise */
            if (!document.getElementById("notLoggedInExercise").classList.contains("hide")) {
                document.getElementById("notLoggedInExercise").classList.toggle("hide");
            }
            document.getElementById("startExercise").classList.toggle("hide");
        }
    }).catch(err => {
        console.log(err);
    })
}

/*
Start exercise button, hides the start exercise div and shows the current exercise div.
*/
function startExercise() {
    document.getElementById("startExercise").classList.toggle("hide");
    document.getElementById("currentExercise").classList.toggle("hide");
    timer(); /* starts the timer for the exercise */
}

/*
Register button, shows the register div and hides all other divs
*/
function registerButton() {
    /* if main body is currently showing, hide it */
    if (document.getElementById("mainBody").classList.contains("hide")) {
        document.getElementById("mainBody").classList.toggle("hide");
        document.getElementById("exerciseTab").classList.toggle("hide");
    }
    document.getElementById("timeline").classList.toggle("hide");
    document.getElementById("register").classList.toggle("hide");

}

/*
Home button, shows home/timeline div and hides all other divs
*/
function homeButton() {
    if (document.getElementById("mainBody").classList.contains("hide")) {
        document.getElementById("mainBody").classList.toggle("hide");
        document.getElementById("exerciseTab").classList.toggle("hide");
    }

    /* hide any divs that aren't the mainbody but are currently showing */
    if (!document.getElementById("exerciseTab").classList.contains("hide")) {
        document.getElementById("exerciseTab").classList.toggle("hide");
    }

    if (!document.getElementById("register").classList.contains("hide")) {
        document.getElementById("register").classList.toggle("hide");
    }
    if (document.getElementById("timeline").classList.contains("hide")) {
        document.getElementById("timeline").classList.toggle("hide");
    }

    /* empties the timeline and reinserts all exercises into it */
    document.getElementById("timeline").innerHTML = "";
    clientGetTimeline();
}

/*
Function that simulates cancelling an exercise.
Called when the user presses "Cancel" during their exercise
*/
function cancelExercise() {

    /* hides the exercise div and shows the start exercise div */
    document.getElementById("currentExercise").classList.toggle("hide");
    document.getElementById("startExercise").classList.toggle("hide");
}

/*
Main function to display all exercises on the home/timeline tab
Called on initialisation and whenever the home button is pressed
*/
function clientGetTimeline() {
    let xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            /* parse all exercises in the database */
            let exercise = JSON.parse(this.responseText);

            /* for every exercise, display all of the relevant information on the timeline */
            for (let i = 0; i < exercise.length; i++) {
                document.getElementById("timeline").innerHTML += '<div class="timelineUpload">' +
                    /* exercise details section */
                    '<div class="exerciseUpload">' +
                    '<div class="exerciseDiv" id="exercise' + exercise[i].id + '">' +
                    '<div class="cProfile">' +
                    '<img class="cProfilePic" src="' + exercise[i].profilePic + '">' +
                    '<p class="cName">' + exercise[i].fullName + '</p>' +
                    '</div>' +
                    '<div class="exerciseInfo">' +
                    '<p class="exerciseTitle">' + exercise[i].title + '</p>' +
                    '<div class="exerciseDescription">' +
                    '<p id="description">Description</p>' +
                    '<p>' + exercise[i].description + '</p>' +
                    '</div>' +
                    '<p class="exerciseDetails">Distance: ' + exercise[i].distance + '</p>' +
                    '<p class="exerciseDetails">Elapsed time: ' + exercise[i].elapsedTime + '</p>' +
                    '</div>' +
                    '<div class="imageSection">' +
                    '<p class="exerciseDetails">Local time: ' + exercise[i].currentTime + '</p>' +
                    '<p class="exerciseDetails">Date: ' + exercise[i].date + '</p>' +
                    '<img class="exerciseImage" src="' + exercise[i].image + '">' +
                    '</div>' +
                    '</div>' +
                    '</div>' +

                    /* comments section */
                    '<div class="viewComments" id="viewComments' + exercise[i].id + '">' +
                    '<p id="commentSection">Comments Section</p>' +
                    '</div>' +

                    '<div class="writeComments" id="writeComments' + exercise[i].id + '">' +
                    '<input type="text" placeholder="Write your comments here..." id="commentBox' + exercise[i].id + '"' +
                    'class="commentBox">' +
                    '<button onclick="clientWriteComment(' + exercise[i].id + ')">Send</button>' +

                    '</div>' +
                    '<div class="notLoggedInExercise hide" id="notLoggedIn' + exercise[i].id + '">' +
                    "<p>You must be logged in to write a comment!</p>" +
                    '</div>' +

                    '</div>' +
                    '<div class="separator">' +
                    '</div>' +
                    '</div>';

                /* insert the comments for each exercise  */
                clientViewComments(exercise[i].id);
            }
        }
    };

    /* request data from /exercises */
    xhttp.open("GET", "/exercises", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

/*
Main function called when uploading a profile picture or exercise picture
*/
async function clientFileUpload(elementID) {
    //Clear server response
    document.getElementById("serverResponse").innerHTML = "";

    let fileArray = document.getElementById(elementID).files;

    /* put file inside FormData object */
    const formData = new FormData();
    formData.append('myFile', fileArray[0]);

    let xhttp = new XMLHttpRequest();
    return new Promise((resolve, reject) => {

        /* if the user has not uploaded a file, 
        set the picture to a stock missing photo picture */
        if (fileArray.length !== 1) {
            resolve("../images/noimage.png");
            /* break out of function */
            return;
        }

        /* retrieve success check from server */
        xhttp.onload = function () {
            let response = JSON.parse(xhttp.responseText);

            /* reject error and resolve the file path */
            if ("error" in response) {

                if (document.getElementById("serverResponse").classList.contains("hide")) {
                    document.getElementById("serverResponse").classList.toggle("hide");
                }
                document.getElementById("serverResponse").innerHTML = "<span style='color: red'>" + response.error + "</span>";
                reject("Error: " + response.error);
            } else {
                if (!document.getElementById("serverResponse").classList.contains("hide")) {
                    document.getElementById("serverResponse").classList.toggle("hide");
                }
                resolve(response.filepath);
            }
        }

        /* post file data to /uploads */
        xhttp.open("POST", "/uploads");
        xhttp.send(formData);
    });
}

/*--------------------Exercise Functions----------------*/

/*
Timer function, used to simulate an exercise
Called when the user starts their exercise
*/
function timer() {
    let secondsCount = 0;
    let minutesCount = 0;
    let distance = 0.00;

    document.getElementById("timer").innerHTML = "0:00";
    document.getElementById("distance").innerHTML = "0.00 km";

    setInterval(function () { // this function is called once every 1000ms
        secondsCount++;  //acts as a seconds counter

        if (secondsCount < 10) {
            secondsCount = "0" + secondsCount;
        }

        if (secondsCount == 60) { // displays the time in a 0:00 (minutes:seconds) format
            minutesCount++;
            secondsCount = 0;
        }
        distance += 0.002; /* every second, increment distance to simulate running distance */

        /* update timer and distance in the HTML page */
        document.getElementById("timer").innerHTML = minutesCount + ":" + secondsCount;
        document.getElementById("distance").innerHTML = distance.toFixed(2) + " km";
    }, 1000);
}

/*
Function that simulates finishing an exercise
Called when the user presses "finish" during an exercise
*/
function finishExercise() {

    /* get current local time and date */
    let current = new Date();
    let currentDate = current.toLocaleDateString();
    let currentTime = current.toLocaleTimeString();

    /* get elapsed time and distance from the timer and distance values */
    let elapsedTime = document.getElementById("timer").innerHTML;
    let distance = document.getElementById("distance").innerHTML;

    let exerciseObj = {
        date: currentDate,
        currentTime: currentTime,
        elapsedTime: elapsedTime,
        distance: distance
    };

    /* hide exercise div and show finalise div, a div which allows the user to
    type a title and description, and upload a picture for the website */
    document.getElementById("currentExercise").classList.toggle("hide");
    document.getElementById("finaliseExercise").classList.toggle("hide");

    /* add event listener for the finalise button, which calls the finaliseExercise function */
    document.getElementById("finaliseButton").addEventListener("click", function () {
        finaliseExercise(exerciseObj);
    });
}

/*
Main function to upload an exercise to the database 
*/
function finaliseExercise(exerciseObj) {
    /* get title and description from input fields */
    let title = document.getElementById("exerciseTitle").value;
    let description = document.getElementById("exerciseDescription").value;

    /* wait for clientFileUpload to run and then wait for getLoggedInUser to run */
    clientFileUpload("exercisePicUpload").then(imagePath => {
        getLoggedInUser().then(result => {

            /* get user id from getLoggedInUser */
            let usrID = result.id;

            let insertObj = {
                userId: usrID,
                title: title,
                description: description,
                date: exerciseObj.date,
                currentTime: exerciseObj.currentTime,
                elapsedTime: exerciseObj.elapsedTime,
                distance: exerciseObj.distance,
                image: imagePath /* get image path from clientFileUpload */
            };

            /* insert the newly created exercise JSON into the database */
            clientInsertExercise(insertObj);
        }).catch(err => { /* handle error */
            console.error(JSON.stringify(err));
        });
    }).catch(err => { /* handle error */
        console.error(JSON.stringify(err));
    });
}

/*
Main function for inserting exercise JSON into the database
*/
function clientInsertExercise(exerciseObj) {

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {

        if (this.readyState == 4 && this.status == 200) {

            /* get success check from /exercises */
            let exerciseResponse = JSON.parse(this.responseText);

            /* inform the user whether the insert was successful or not */
            if (exerciseResponse.success) {
                document.getElementById("finaliseExercise").innerHTML = "<p>What a fantastic run! Head on over to the timeline to view your stats!</p>";
            }
            else if (!exerciseResponse.success) {
                document.getElementById("register").innerHTML = "<span style='color: red'>Error adding user</span>";
            }
        }
    };

    /* post exercise JSON to /exercises */
    xhttp.open("POST", "/exercises", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(exerciseObj));
}

/*--------------------Comment Functions--------------------------*/
/*
Function that is used to insert a comment into the database
Called when the user presses the send button next to the comment box
*/
function clientWriteComment(exerciseID) {

    /* wait for checkLogin to run */
    asyncCheckLogin().then(result => {

        /* if user is not logged in, inform the user that they must be logged in to comment, 
        and do not upload the comment into the database; return out of the function */
        if (result == false) {
            if (!document.getElementById("writeComments" + exerciseID).classList.contains("hide")) {
                document.getElementById("writeComments" + exerciseID).classList.toggle("hide");
                document.getElementById("notLoggedIn" + exerciseID).classList.toggle("hide");
            }
            return;

        } else {
            /* if the user is logged in, get their comment from the comment box */
            let comment = document.getElementById("commentBox" + exerciseID).value;

            let commentObj = {
                id: exerciseID,
                comment: comment
            };

            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    let responseJSON = JSON.parse(xhttp.responseText);

                    if (responseJSON.success) {
                        /* if the comment upload was a success, update the displayed comments */
                        document.getElementById("commentBox" + exerciseID).value = "";

                        clientViewComments(exerciseID);
                    }
                }
            };

            /* post data to /writeComment */
            xhttp.open("POST", "/writeComment", true);
            xhttp.setRequestHeader("Content-type", "application/json");
            xhttp.send(JSON.stringify(commentObj));

        }
    }).catch(err => {
        console.log(err);
    })
}

/*
Main function used to display all of the comments under an exercise in the timeline
*/
function clientViewComments(exerciseID) {

    let xhttp = new XMLHttpRequest();
    let idJSON = {
        id: exerciseID
    };

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {

            let exerciseComments = JSON.parse(xhttp.responseText);
            if (exerciseComments.success === undefined) {

                document.getElementById("viewComments" + exerciseID).innerHTML = '<p id="commentSection">Comments Section</p>';

                /* for every comment, display relevant information for that comment underneath the exercise */
                for (let i = 0; i < exerciseComments.length; i++) {

                    document.getElementById("viewComments" + exerciseID).innerHTML +=
                        '<div class="comment">' +
                        '<img class="commentPic" src="' + exerciseComments[i].profilePic + '">' +
                        '<div class="commentBody">' +
                        '<div class="commentHeader">' +
                        '<p class="commentName">' + exerciseComments[i].fullName + '</p>' +
                        '<p class="commentDate">' + exerciseComments[i].date + '</p>' +
                        '<p class="commentTime">' + exerciseComments[i].time + '</p>' +
                        '</div>' +
                        '<p class="commentText">' + exerciseComments[i].comment + '</p>' +
                        '</div>' +
                        '</div>';
                }
            } else {
                document.getElementById("viewComments" + exerciseID).innerHTML =
                    '<p class="noComments">No comments</p>';
            }
        }
    };

    /* post exercise id to /comments */
    xhttp.open("POST", "/comments", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(idJSON));
}

/*-----------------Account Functions--------------*/
/*
Main function to register a user and upload their data to the server
*/
function clientRegister() {
    let xhttp = new XMLHttpRequest();

    /* get the user data from the input fields */
    let usrFName = document.getElementById("firstName").value;
    let usrSurname = document.getElementById("surname").value;
    let usrEmail = document.getElementById("registerEmail").value;
    let usrPassword = document.getElementById("registerPassword").value;
    let usrObj = {};

    /* wait for clientFileUpload to run */
    clientFileUpload("registerPic").then(imagePath => {

        /* create JSON from inputted data */
        usrObj = {
            firstName: usrFName,
            surname: usrSurname,
            email: usrEmail,
            password: usrPassword,
            image: imagePath
        };

        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {

                let returnJson = JSON.parse(this.responseText);

                /* inform the user on whether or not the insert was a success */
                if (returnJson.success) {
                    if (!document.getElementById("serverResponse").classList.contains("hide")) {
                        document.getElementById("serverResponse").classList.toggle("hide");
                    }
                    document.getElementById("register").innerHTML = "<span style='color: green'>Thank you for registering an " +
                        "account with RunnerUP! We hope you love it here! Log in and then head on over to the Home tab to view everyone else's exercises " +
                        "or go to the Exercise tab to get started!";
                } else {
                    if (document.getElementById("serverResponse").classList.contains("hide")) {
                        document.getElementById("serverResponse").classList.toggle("hide");
                    }
                    document.getElementById("serverResponse").innerHTML = "<span style='color: red'>" + returnJson.error + "</span>";

                }
            }
        };

        /* post user data to /users */
        xhttp.open("POST", "/users", true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send(JSON.stringify(usrObj));

    }).catch(err => {
        console.log(err);
    });
}

/*
Main function used to sign the user out
*/
function clientSignOut() {

    let xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            /* show the login form again */
            document.getElementById("loggedIn").innerHTML = "";
            document.getElementById("loginForm").classList.toggle("hide");
        }
    };

    /* request data from /signOut */
    xhttp.open("GET", "/signOut", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

/* ---------------------Login functions --------------------
Main function to log the user in
*/
function clientLogin() {

    let xhttp = new XMLHttpRequest();

    /* extract user inputted email and password from login form */
    let emailAddress = document.getElementById("loginEmail").value;
    let userPassword = document.getElementById("loginPassword").value;

    /* create user object with email and password */
    let usrObj = {
        email: emailAddress,
        password: userPassword,
    };

    let usrJson;

    //Set up function that is called when reply received from server
    xhttp.onreadystatechange = function () {

        if (this.readyState == 4 && this.status == 200) {

            usrJson = JSON.parse(this.responseText);

            /* if login was a success, display users profile picture and name instead of the login form */
            if (usrJson.success) {
                if (document.getElementById("loginError").classList.contains("show")) { // checks if the error popup is still showing
                    document.getElementById("loginError").classList.toggle("show"); // hides the popup if it is still there
                }

                if (!document.getElementById("notLoggedInExercise").classList.contains("hide")) {
                    document.getElementById("notLoggedInExercise").classList.toggle("hide");
                    document.getElementById("startExercise").classList.toggle("hide");
                }

                document.getElementById("loginForm").classList.toggle("hide");
                document.getElementById("loggedIn").innerHTML = "<img class='profilePic' src= " + usrJson.profilePic + " alt='PROFILE_PIC'>"
                    + "<p id='loginFeedback'>" + usrJson.fullName + "</p>"
                    + "<button onclick='clientSignOut()'>Sign Out</button>";
            } else {
                /* if the login was unsuccessful, inform the user */
                document.getElementById("loginError").classList.toggle("show");
                document.getElementById("loginError").innerHTML = "<span>Username or password does not match.</span>";
            }
        }
    };

    /* post login data to /login */
    xhttp.open("POST", "/login", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(usrObj));
}

/*
Function to check if user is logged in or not
This is used to update the login box if the page is reloaded, 
to show that the user is still logged in
*/
function clientCheckLogin() {

    let xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {

        if (xhttp.readyState == 4 && xhttp.status == 200) {

            let usrJSON = JSON.parse(this.responseText);

            /* if the user is logged in, display their profile picture, their name and a sign out button */
            if (usrJSON.success) {
                document.getElementById("loginForm").classList.toggle("hide"); // hides the login form

                document.getElementById("loggedIn").innerHTML = "<img class='profilePic' src= " + usrJSON.profilePic + " alt='PROFILE_PIC'>"
                    + "<p id='loginFeedback'>" + usrJSON.fullName + "</p>"
                    + "<button onclick='clientSignOut()'>Sign Out</button>";

                return true;

            } else {
                /* return false if the user is not logged in */
                return false;
            }
        }
    };

    /* get login status from /users/* */
    xhttp.open("GET", "/users/*", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

/*
Asynchronous login check
*/
function asyncCheckLogin() {
    let xhttp = new XMLHttpRequest();

    return new Promise((resolve, reject) => {

        xhttp.onreadystatechange = function () {

            if (xhttp.readyState == 4 && xhttp.status == 200) {

                let responseJSON = JSON.parse(this.responseText);

                /* resolve indicates whether or not the user is logged in */
                if (responseJSON.success) {

                    resolve(true);

                } else {

                    resolve(false);
                }
            }
        }

        /* get login status from /users/* */
        xhttp.open("GET", "/users/*", true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send();
    });
}

/*
Asynchronous function to get the data of the logged in user
*/
async function getLoggedInUser() {

    let xhttp = new XMLHttpRequest();

    let selectPromise = new Promise((resolve, reject) => {

        xhttp.onreadystatechange = function () {

            if (xhttp.readyState == 4 && xhttp.status == 200) {

                let loginCheck = JSON.parse(this.responseText);

                /* if the user is logged in, return their details */
                if (loginCheck.success && this.responseText != "") {

                    resolve(loginCheck);
                } else {
                    reject(loginCheck);
                }
            }

            if (xhttp.readyState > 4 || xhttp.status > 200) {
                reject("Server error.");
            }
        };

        /* get user data from server */
        xhttp.open("GET", "/users/*", true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send();

    });
    try {
        /* execute promise and return the user object */
        let usrObj = await selectPromise;
        return usrObj;
    } catch (err) {
        console.error(JSON.stringify(err));
    }
}
