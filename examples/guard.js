/**
 * This bot example shows the basic usage of the mineflayer-pvp plugin for guarding a defined area from nearby mobs.
 */
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const mcleaks = require('node-mcleaks')
const inventoryViewer = require('mineflayer-web-inventory')
const vec3 = require('vec3')
const armorManager = require('mineflayer-armor-manager')
const autoeat = require("mineflayer-auto-eat")
const fs = require('fs');
let tick_since_warn = 400;

// Log content type
require('axios-debug-log')({
  request: function (debug, config) {
    debug('Request with ' + config.headers['content-type'])
  },
  response: function (debug, response) {
    debug(
      'Response with ' + response.headers['content-type'],
      'from ' + response.config.url
    )
  },
  error: function (debug, error) {
    // Read https://www.npmjs.com/package/axios#handling-errors for more info
    debug('Boom', error)
  }
});

let bot;
let done = false;
if (process.argv.length != 5) {
  console.log('Usage : node guard.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const navigatePlugin = require('mineflayer-navigate')(mineflayer);
let OP = ['LeoCornelius', 'FIRIN_MA_LAZER', 'maneatingduck'];
let rawNOWARN = fs.readFileSync('config.json')
let NOWARN = JSON.parse(rawNOWARN).nowarn;
console.log(NOWARN);

let targetEntity;
const homeblockPos = vec3(503, 65, -900);

const options = {
  username: "MCLeaks", //You have to put something here
  mcLeaks: true,
  token: process.argv[4], //Your MCLeaks token
  haveCredentials: true,
  host: process.argv[2],
  port: parseInt(process.argv[3])
};
/*
mcleaks.redeem(options, function (err, data) { //options.token should be defined
  if (err) {
    log("Something went wrong with mcLeaks authentication.");
    throw err;
  }
  options.session = {
    accessToken: data.result.session,
    selectedProfile: {
      name: data.result.mcname
    }
  };
  options.token = undefined;
  console.log('Session Set:');
  console.log(options.session);
  init();
});
*/
options.session = {
  accessToken: 'sC8ZUOkMkIGoX1mYio2CmjnDMTPvGj99Wh9Q5tDqckOala8EybgVvEyhyoMeIWoE',
  selectedProfile: { name: 'steeldeadeye' }
}
options.token = undefined;
init();


function init(first = true) {
  console.log('Init Bot');
  bot = mineflayer.createBot(options);
  let WIoptions = {
    port: 3001
  };

  inventoryViewer(bot, WIoptions)
  bot.loadPlugin(autoeat)

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(pvp)
  //bot.loadPlugin(require('mineflayer-dashboard'))

  // install the plugin
  navigatePlugin(bot);
  bot.loadPlugin(armorManager);
  bot.navigate.on('pathFound', function (path) {
    bot.chat("/w LeoCornelius found path. I can get there in " + path.length + " moves.");
  });
  bot.navigate.on('cannotFind', function (closestPath) {
    bot.chat("/w LeoCornelius unable to find path. getting as close as possible");
    bot.navigate.walk(closestPath);
  });
  bot.navigate.on('arrived', function () {
    bot.chat("/w LeoCornelius I have arrived");
  });
  bot.navigate.on('interrupted', function () {
    bot.chat("/w LeoCornelius stopping");
  });
  bot.once('spawn', () => {
    mineflayerViewer(bot, { port: 3007, firstPerson: false })
    bot.autoEat.options = {
      priority: "saturation",
      startAt: 14,
      bannedFood: ["golden_apple", "enchanted_golden_apple", "rotten_flesh"],
    }
  })
  console.log("YEHA");

  let guardPos = null
  let timeoutId;
  // Assign the given location to be guarded
  function guardArea(pos) {
    console.log(pos);
    guardPos = pos

    // We we are not currently in combat, move to the guard pos
    if (!bot.pvp.target) {
      moveToGuardPos()
    }
  }

  // Cancel all pathfinder and combat
  function stopGuarding() {
    guardPos = null
    bot.pvp.stop()
    bot.pathfinder.setGoal(null)
  }


  // Pathfinder to the guard position
  function moveToGuardPos() {
    const mcData = require('minecraft-data')(bot.version)
    movements = new Movements(bot, mcData);
    movements.canDig = false;
    bot.pathfinder.setMovements(movements)
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
  }



  // Called when the bot has killed it's target.
  bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos()
    }
  })

  // Check for new enemies to attack
  bot.on('physicTick', () => {
    tick_since_warn += 1;
    // look for players within redner distanced
    if (tick_since_warn > 400) {
      const filterPlayer = e => e.type === 'player' && !NOWARN.includes(e.username)
      const Playerentity = bot.nearestEntity(filterPlayer);
      if (Playerentity != null) {
        date = new Date();
        bot.chat('/w ' + Playerentity.username + " please leave the surrounding area of the prison imidiatley. Failure to do so will result in execution and trial for trespassing. Your prescense has been logged");
        fs.appendFileSync('warns.txt', Playerentity.username + '[' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ']');
      }
      tick_since_warn = 0;
    }
    if (!guardPos) return // Do nothing if bot is not guarding anything

    // Only look for mobs within 16 blocks
    const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?

    const entity = bot.nearestEntity(filter)
    if (entity) {
      // Start attacking
      bot.pvp.attack(entity)
    }
  })
  bot.on('kicked', (reason, loggedIn) => {
    console.log('KICKED: ' + reason, + ', LOGGED IN: ' + loggedIn);
    process.exit(1); // restart
    //return init();
  })

  function checkPlayer() {

  }
  // Listen for player commands
  bot.on('chat', (username, message) => {
    // Guard the location the player is standing
    if (message === '!guard' && OP.includes(username)) {
      const player = bot.players[username]

      if (!player) {
        bot.chat('/w ' + username + " I can't see you.")
        return
      }

      bot.chat('/w ' + username + ' I will guard that location.')
      guardArea(player.entity.position);
    }
    if (message === '!come' && OP.includes(username)) {
      const player = bot.players[username];
      bot.navigate.to(player.entity.position);
    }

    // Stop guarding
    if (message === '!stop' && OP.includes(username)) {
      bot.chat('/w ' + username + ' I will no longer guard this area.')
      stopGuarding()
      bot.navigate.stop();
    }
    if (message === '!gotohome' && OP.includes(username)) {
      bot.chat('/w ' + username + " Returning to home block");
      bot.navigate.stop();
      stopGuarding();
      bot.navigate.to(homeblockPos);
    }

    if (message === 'hi') {
      bot.chat('Hello.');
    }
    if (message === '!log' && OP.includes(username)) {
      process.exit(1)
    }
    split = message.split(' ');
    if (split[0] === '!nowarn' && split.length == 2 &&OP.includes(username)) {
      NOWARN.push(split[1]);
      let CONFIG_ = {
        nowarn: NOWARN
      };
      let data = JSON.stringify(CONFIG_);
      fs.writeFileSync('config.json', data);
    }
    
    if (split[0] === '!warn' && split.length == 2 &&OP.includes(username)) {
      NOWARN.filter(item => item !== split[1]);
      let CONFIG_ = {
        nowarn: NOWARN
      };
      let data = JSON.stringify(CONFIG_);
      fs.writeFileSync('config.json', data);
    }
  })


}

//while (options.token != undefined) { }
//init()