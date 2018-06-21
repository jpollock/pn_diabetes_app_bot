"use strict";
var request = require('request');
var qs = require('querystring');
var crypto = require('crypto');
var moment = require('moment-timezone');
var PubNub = require('pubnub');

// load the jquery/kitchen-sink example to see the bot in action

let ChatEngineCore = require('chat-engine');
let typingIndicator = require('chat-engine-typing-indicator');

var ChatEngine = ChatEngineCore.create({
    publishKey: readENV('PUBNUB_CHAT_PUBLISH_KEY'), 
    subscribeKey: readENV('PUBNUB_CHAT_SUBSCRIBE_KEY'),
}, {
    globalChannel: readENV('PUBNUB_CHAT_GLOBAL_CHANNEL'), 
    debug: false
});

const now = new Date().getTime();
const username = ['user!', now].join('-');

var generatePerson = function(online) {

    var person = {};


    person.first = 'Type1Diabetes';
    person.last = 'Wizard';

    person.full = [person.first, person.last].join(" ");
    person.uuid = new Date().getTime();
    
    person.online = online || false;

    person.lastSeen = Math.floor(Math.random() * 60);

    return person;

}

let newPerson = generatePerson(true);

ChatEngine.connect(newPerson.uuid, newPerson);

//ChatEngine.connect('robot', { username: 'rob-the-robot' }, 'auth-key');
/*ChatEngine.connect(username, {
    signedOnTime: now
}, 'auth-key' + new Date().getTime());*/


var chats = {};

ChatEngine.onAny((a) => {
    console.log(a)

})


var Defaults = {
  "applicationId":"d89443d2-327c-4a6f-89e5-496bbb0317db"
, "lastGuid":"1e0c094e-1e54-4a4f-8e6a-f94484b53789" // hardcoded, random guid; no Glooko docs to explain need for param or why bad data works
, login: 'https://' + server + '/api/v2/users/sign_in'
, accept: 'application/json'
, 'content-type': 'application/json'
, LatestFoods: 'https://' + server + '/api/v2/foods'
, LatestInsulins: 'https://' + server + '/api/v2/insulins'
// ?sessionID=e59c836f-5aeb-4b95-afa2-39cf2769fede&minutes=1440&maxCount=1"
, nightscout_upload: '/api/v1/treatments.json'
, MIN_PASSPHRASE_LENGTH: 12
};

var getLastMeal = function(then) {
    var login_opts = {
        accountName: readENV('GLOOKO_ACCOUNT_NAME')
        , password: readENV('GLOOKO_PASSWORD')
    };
    var fetch_opts = { maxCount: readENV('maxCount', 1)
        , minutes: readENV('minutes', 1440)
    };
    var resp = 'I do not know.'
    authorize(login_opts, function (err, res, body) {
        var arr = {};
        fetch_opts.sessionID = res.headers['set-cookie'][0];
        var d_now = Date.now();
        var d_then = new Date(d_now - 600*60000)
        //console.log(d_then);
        //var fetch_opts = Object.create(opts.fetch);
        fetch_opts.lastUpdatedAt = d_then.toISOString();

        fetch(Defaults.LatestFoods, fetch_opts, function (err, res, foods) {
          fetch(Defaults.LatestInsulins, fetch_opts, function (err, res, insulins) {
            arr['foods'] = foods;
            arr['insulins'] = insulins;
            console.log(arr);
            resp = arr['foods']['foods'][0].carbs;
            then(err, resp);  
            //return resp;
           });
        });
    });    
    
}

ChatEngine.on('message', (a) => {
    if (a.data.text.toString().indexOf('@t1dwizard') > -1) {
        var chat = chats[readENV('PUBNUB_CHAT_CHANNEL')];
        var resp = 'I do not know!';
        if (a.data.text.indexOf('help') > -1) {
            resp = 'You tell me what you want!';
            chat.emit('message', {
                text: resp
            });        


        } else if (a.data.text.indexOf('last meal') > -1) {
            resp = getLastMeal(function(err, message) {

                chat.emit('message', {
                    text: message
                });        

            });
        }
    }
        

    
})

ChatEngine.on('$.ready', (data) => {
    console.log(data);
    let me = data.me;

    chats['chatengine-meta2'] = new ChatEngine.Chat('chatengine-meta2');
    me.direct.on('$.invite', (payload) => {
        console.log('INVITE');
        var chat = chats[payload.data.channel];

        if (!chat) {

            chats[payload.data.channel] = new ChatEngine.Chat(payload.data.channel);

            chat = chats[payload.data.channel];

            chat.plugin(typingIndicator({
                timeout: 5000
            }));

            chat.emit('message', {
                text: 'hey, how can I help you?'
            });

            chat.on('message', (payload) => {
                console.log(payload);
                if (payload.sender.uuid !== me.uuid) { // add to github issues

                    setTimeout((argument) => {

                        chat.typingIndicator.startTyping();

                        setTimeout((argument) => {

                            chat.emit('message', {
                                text: 'hey there ' + payload.sender.state.username
                            });

                            chat.typingIndicator.stopTyping(); // add this to plugin middleware

                        }, 1000);

                    }, 500);

                }

            });

        }

    });

});


// Defaults
var server = "api.glooko.com"
var bridge = readENV('GLOOKO_SERVER')
    if (bridge && bridge.indexOf(".") > 1) {
    server = bridge;
   } 
    else if (bridge && bridge === 'EU') {
        server = "api.glooko.com";
    } else {
        server = "api.glooko.com";
    }

var Defaults = {
  "applicationId":"d89443d2-327c-4a6f-89e5-496bbb0317db"
, "lastGuid":"1e0c094e-1e54-4a4f-8e6a-f94484b53789" // hardcoded, random guid; no Glooko docs to explain need for param or why bad data works
, login: 'https://' + server + '/api/v2/users/sign_in'
, accept: 'application/json'
, 'content-type': 'application/json'
, LatestFoods: 'https://' + server + '/api/v2/foods'
, LatestInsulins: 'https://' + server + '/api/v2/insulins'
// ?sessionID=e59c836f-5aeb-4b95-afa2-39cf2769fede&minutes=1440&maxCount=1"
, nightscout_upload: '/api/v1/treatments.json'
, MIN_PASSPHRASE_LENGTH: 12
};



// assemble the POST body for the login endpoint
function login_payload (opts) {
  var body = {
    "userLogin": {
      "email": opts.accountName,
      "password": opts.password
    },
    "deviceInformation": {
      "deviceModel": "iPhone"
    }    
  };
  return body;
}

// Login to Glooko's server.
function authorize (opts, then) {
  var url = Defaults.login;
  var body = login_payload(opts);
  var headers = { 'User-Agent': Defaults.agent
                , 'Content-Type': Defaults['content-type']
                , 'Accept': Defaults.accept };
  var req ={ uri: url, body: body, json: true, headers: headers, method: 'POST'
           , rejectUnauthorized: false };
  // Asynchronously calls the `then` function when the request's I/O
  // is done.
  return request(req, then);
}

// Assemble query string for fetching data.
function fetch_query (url, opts) {
  // ?sessionID=e59c836f-5aeb-4b95-afa2-39cf2769fede&minutes=1440&maxCount=1"
  var q = {
    //lastUpdatedAt: opts.lastUpdatedAt
  //, 
    lastGuid: Defaults.lastGuid
  , sendSoftDeleted: opts.sendSoftDeleted || false
  , limit: opts.maxCount || 1000
  };
  url += '?lastUpdatedAt=' + opts.lastUpdatedAt  + '&' + qs.stringify(q);
  console.log(url);
  return url;
}

// Asynchronously fetch data from Dexcom's server.
// Will fetch `minutes` and `maxCount` records.
function fetch (url, opts, then) {

  var url = fetch_query(url, opts);
  var headers = { 'User-Agent': Defaults.agent
                , 'Content-Type': Defaults['content-type']
                , 'Content-Length': 0
                , 'Accept': Defaults.accept
                , 'Cookie': opts.sessionID };

  var req ={ uri: url, json: true, headers: headers, method: 'GET'
           , rejectUnauthorized: false };
  return request(req, then);
}

// Authenticate and fetch data from Dexcom.
function do_everything (opts, then) {
  var login_opts = opts.login;
  var fetch_opts = opts.fetch;
  authorize(login_opts, function (err, res, body) {
    var arr = {};
    fetch_opts.sessionID = res.headers['set-cookie'][0];
    var d_now = Date.now();
    var d_then = new Date(d_now - 600*60000)
    //console.log(d_then);
    //var fetch_opts = Object.create(opts.fetch);
    fetch_opts.lastUpdatedAt = d_then.toISOString();

    fetch(Defaults.LatestFoods, fetch_opts, function (err, res, foods) {
      fetch(Defaults.LatestInsulins, fetch_opts, function (err, res, insulins) {
        arr['foods'] = foods;
        arr['insulins'] = insulins;
        console.log("Foods: " + foods.length + " Insulins:" + insulins.length);
        then(err, arr);  
      });
    });
  });

}

function readENV(varName, defaultValue) {
    //for some reason Azure uses this prefix, maybe there is a good reason
    var value = process.env['CUSTOMCONNSTR_' + varName]
        || process.env['CUSTOMCONNSTR_' + varName.toLowerCase()]
        || process.env[varName]
        || process.env[varName.toLowerCase()];

    return value || defaultValue;
}

var config = {
accountName: readENV('GLOOKO_ACCOUNT_NAME')
, password: readENV('GLOOKO_PASSWORD')
};
var interval = readENV('SHARE_INTERVAL', 60000 * 2.5);
var fetch_config = { maxCount: readENV('maxCount', 1)
, minutes: readENV('minutes', 1440)
};
var meta = {
login: config
, fetch: fetch_config
, maxFailures: readENV('maxFailures', 3)
, firstFetchCount: readENV('firstFetchCount', 3)
};


var pubnub = new PubNub({
  publishKey : readENV('PUBNUB_PUBLISH_KEY'),
  subscribeKey : readENV('PUBNUB_SUBSCRIBE_KEY'),
  ssl: true
})


var updateChat = function(message) {
    var chat = chats['chatengine-meta2'];
    chat.emit('message', {
        text: message
    });        
}
pubnub.addListener({
    message: function(m) {
        // handle message
        var channelName = m.channel; // The channel for which the message belongs
        var channelGroup = m.subscription; // The channel group or wildcard subscription match (if exists)
        var pubTT = m.timetoken; // Publish timetoken
        var msg = m.message; // The Payload
        var publisher = m.publisher; //The Publisher
        updateChat(msg['eon']['bg']);
    },
    presence: function(p) {
        // handle presence
        var action = p.action; // Can be join, leave, state-change or timeout
        var channelName = p.channel; // The channel for which the message belongs
        var occupancy = p.occupancy; // No. of users connected with the channel
        var state = p.state; // User State
        var channelGroup = p.subscription; //  The channel group or wildcard subscription match (if exists)
        var publishTime = p.timestamp; // Publish timetoken
        var timetoken = p.timetoken;  // Current timetoken
        var uuid = p.uuid; // UUIDs of users who are connected with the channel
    },
    status: function(s) {
        var affectedChannelGroups = s.affectedChannelGroups;
        var affectedChannels = s.affectedChannels;
        var category = s.category;
        var operation = s.operation;
    }
});

pubnub.subscribe({
    channels: [readENV('PUBNUB_CHANNEL')]
});



const express = require('express')
const app = express()
const PORT = process.env.PORT || 5000

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(PORT, () => console.log('Example app listening on port =' + PORT + ' !'))