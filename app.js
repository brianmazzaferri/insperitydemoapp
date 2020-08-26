// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
const Datastore = require("nedb"), //(require in the database)
  // Security note: the database is saved to the file `datafile` on the local filesystem. It's deliberately placed in the `.data` directory
  // which doesn't get copied if someone remixes the project.
  db = new Datastore({ filename: ".data/datafile", autoload: true }); //initialize the database

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: ['commands','app_mentions:read','channels:history','channels:join','channels:read','chat:write','chat:write.customize','chat:write.public','reactions:read','reactions:write'], //add scopes here
  installationStore: {
    storeInstallation: (installation) => {
      console.log("INSTALLATION:");
      console.log(installation);
      return db.insert(installation, (err, newDoc) => {
        if (err) console.log("There's a problem with the database ", err);
        else if (newDoc) console.log("installation insert completed");
      });
    },
    fetchInstallation: async (InstallQuery) => {
      console.log("FETCH:");
      console.log(InstallQuery);
      let incomingteam = InstallQuery.teamId;
      let result = await queryOne({"team.id":InstallQuery.teamId});
      console.log(result);
      return result;
    },
  },
});

//LISTENERS GO HERE

app.command('/prospect', async ({ ack, payload, context }) => {
  // Acknowledge the command request
  ack();

  try {
    const result = await app.client.chat.postMessage({
      token: context.botToken,
      // Channel to send message to
      channel: payload.user_id,
      // Include a button in the message (or whatever blocks you want!)
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*New Prospect Alert!* a prospect has submitted <www.oursite.com|documentation> on our portal'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Run Analysis'
            },
            action_id: 'run_analysis'
          }
        }
      ],
      // Text in the notification
      text: 'New Prospect Alert!'
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});

app.action('run_analysis', async ({ ack, body, context }) => {
  ack();
  try{
    const viewLoad = require ("./JSON/profitmodal.json");
    const result = await app.client.views.open({
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: JSON.stringify(viewLoad)
    });
  } catch (error){
      console.error(error);
  }
});

app.view('main1', async ({ack, body, view, context})=> {
  ack();
  try{
    const viewLoad = require ("./JSON/success.json");
    const result = await app.client.views.open({
      token:context.botToken,
      trigger_id: body.trigger_id,
      view: JSON.stringify(viewLoad)
    }); 
  } catch(error){
    console.error(error);
  }
});

app.view('main2', async ({ack, body, view, context})=> {
  ack();
  try{
    const msgLoad = require ("./JSON/successmessage.json");
    const result = await app.client.chat.postMessage({
      token:context.botToken,
      channel:body.user_id,
      text:"Calculation Saved!",
      blocks: JSON.stringify(msgLoad)
    });
  }catch(error){
    console.error(error);
  }
});

//BOILERPLATE BELOW HERE

//look up any one document from a query string
function queryOne(query) {
  return new Promise((resolve, reject) => {
    db.findOne(query, (err, docs) => {
      if (err) console.log("There's a problem with the database: ", err);
      else if (docs) console.log(query + " queryOne run successfully.");
      resolve(docs);
    });
  });
}

//print the whole database (for testing)
function printDatabase() {
  db.find({}, (err, data) => {
    if (err) console.log("There's a problem with the database: ", err);
    else if (data) console.log(data);
  });
}

//clear out the database
function clearDatabase(team,channel) {
  db.remove({team:team, channel:channel}, { multi: true }, function(err) {
    if (err) console.log("There's a problem with the database: ", err);
    else console.log("database cleared");
  });
}
(async () => {
  // boilerplate to start the app
  await app.start(process.env.PORT || 3000);
  //printDatabase();
  console.log("⚡️ Bolt app is running!");
})();
