const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json())

var ipservers = {};

app.post('/authenticate', async (req, res) => {
  console.log("/authenticate");
  var response = await axios({
    method: "POST",
    url: "https://auth.mcleaks.net/v1/redeem",
    data: {
      token: req.body.username
    }
  });
  res.send({
    accessToken: response.data.result.session,
    clientToken: req.body.clientToken,
    "availableProfiles": [
        {
            "agent": req.body.agent.name,
            "id": response.data.result.mcname,
            "name": response.data.result.mcname,
            "userId": response.data.result.mcname,
            "createdAt": 0,
            "legacyProfile": false,
            "suspended": false,
            "paid": true,
            "migrated": false
        }
    ],
    "selectedProfile": {
            "agent": req.body.agent.name,
            "id": response.data.result.mcname,
            "name": response.data.result.mcname,
            "userId": response.data.result.mcname,
            "createdAt": 0,
            "legacyProfile": false,
            "suspended": false,
            "paid": true,
            "migrated": false
    },
    "user": {
        "id": response.data.result.mcname,
        "email": response.data.result.mcname,
        "username": response.data.result.mcname,
        "registerIp": "192.168.1.*",
        "migratedFrom": "minecraft.net",
        "migratedAt": 0,
        "registeredAt": 0,
        "passwordChangedAt": 0,
        "dateOfBirth": 0,
        "suspended": false,
        "blocked": false,
        "secured": true,
        "migrated": false,
        "emailVerified": true,
        "legacyUser": false,
        "verifiedByParent": false,
        "properties": []
    }
  })
})
app.post('/validate', async (req, res) => {
  console.log("/validate");

  res.status(403).send()
})
app.post('/refresh', async (req, res) => {
  console.log("/refresh");

  res.status(403).send()
})
app.post('/session/minecraft/join', async (req, res) => {
  console.log("/join");

  var response = await axios({
    method: "POST",
    url: "https://auth.mcleaks.net/v1/joinserver",
    data: {
      session: req.body.accessToken,
      mcname: req.body.selectedProfile,
      serverhash: req.body.serverId,
      server: ipservers[req.headers['x-forwarded-for'].split(",")[0]]
    }
  });
  if (response.data.success){
    res.status(204).send()
  } else {
    res.status(403).send()
  }
})
app.post('/setserver', async (req, res) => {
  console.log("/setserver");
  ipservers[req.headers['x-forwarded-for'].split(",")[0]] = req.body.server;
  res.send({success: true})
})
console.log("Listening");
app.listen(3000)

