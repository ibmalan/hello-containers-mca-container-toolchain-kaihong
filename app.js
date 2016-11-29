/**
* Copyright 2014 IBM
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
**/
const express = require('express');
const log4js = require('log4js');
const request = require('request');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const pug = require('pug');

var logger = log4js.getLogger("MyApp");

// Define properties required for OAuth flows
var clientId = "4b07cfe1-3875-419c-a0a2-8fb0a7b43dff";
var clientSecret = "MDlkYjZkYjAtOGVkOS00MjcxLWE5ZTMtMWNlODVhMDQ0MDUy";
var callbackUri = "http://hello-containers-simple-container-toolchain-1480387789477.mybluemix.net/oauth/callback";
var authzEndpoint = "https://mobileclientaccess.ng.bluemix.net/oauth/v2/authorization";
var tokenEndpoint = "https://mobileclientaccess.ng.bluemix.net/oauth/v2/token";

// Setup express and add express-session
var app = express();
app.use(session({
	secret: "12345",
	resave: true,
	saveUninitialized: true
}));

app.set('view engine', 'pug');

// Home page
app.get("/", function(req, res, next){
	logger.debug("Loading home page");
	var data = {};
	if (req.session.mca) {
		var userIdentity = req.session.mca.userIdentity;
		data.isAuthenticated = true;
		data.name = userIdentity.displayName;
		data.photo = "https://image.freepik.com/free-icon/user-silhouette_318-79814.png";
		var picture = userIdentity.attributes.picture;
		if (typeof(picture) !== "undefined") {
			data.photo = (typeof(picture) === "string") ? picture : picture.data.url;
		}
	}
	res.render("index.pug", data);
});

// Login
app.get("/login", function(req, res, next){
	logger.debug("Redirecting to MCA for authorization");
	var authzUri = authzEndpoint + "?response_type=code";
	authzUri += "&client_id=" + clientId;
	authzUri += "&redirect_uri=" + callbackUri;
	res.redirect(authzUri);
});

// Logout
app.get("/logout", function(req, res, next){
	logger.debug("Logging out");
	delete req.session.mca;
	res.redirect("/");
})

// OAuth callback
app.get("/oauth/callback", function(req, res, next){
	logger.debug("Received callback from MCA");
	var grantCode = req.query.code;
	if (!grantCode || grantCode == ""){
		logger.error("Authorization failed!");
		res.redirect("/");
		return;
	}

	var formData = {
		grant_type: "authorization_code",
		client_id: clientId,
		redirect_uri: callbackUri,
		code: req.query.code
	};

	logger.debug("Requesting accessToken and idToken from MCA");
	request.post({
		url: tokenEndpoint,
		formData: formData
	}, function (err, response, body) {
		var parsedBody = JSON.parse(body);
		req.session.mca = {
			accessToken: jwt.decode(parsedBody.access_token),
			idToken: jwt.decode(parsedBody.id_token),
			userIdentity: jwt.decode(parsedBody.id_token)["imf.user"]
		};
		res.redirect("/");
	}).auth(clientId, clientSecret);
});

var port = 80;
app.listen(port, function () {
	logger.info('Listening on', port);
});
