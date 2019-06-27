'use strict';

const mysql = require('mysql');
const aws = require('aws-sdk');
const fs = require('fs');

const lookUp = require('./lookup.js');

const Alexa = require('ask-sdk-core');
const Welcome = require('./json/welcome.json');
const LibraryWelcome = require('./json/librarywelcome.json');
const MovieOptions = require('./json/movieoptions.json');
const Review = require('./json/review.json');
const Background = require('./json/background.json');

const welcome = 'Welcome to The Best Darn Girls Movie Reviews on Alexa.  For the latest reviews of movies in the theater, say In The Theater.  For the latest TV movies, say Made for TV.  For the Must Buy movie of the week, say Must Buy.  For Video on Demand reviews, say Video on Demand. To search The Best Darn Girls Library, say Library.';
const mainOptions = '\t* In The Theater\n\t* Made For TV\n\t* Must Buy\n\t* Video On Demand\n\t* Library';
const mainScreen = '* In The Theater<br/>* Made for TV<br/>* Must Buy<br/>* Video On Demand<br/>* Library';
const repeatGoBack = '  To hear the review again, say repeat.  To go back to the movie options, say movie options.  To go back to the main menu, say main menu.  To exit, say good bye';
const sorry = 'Sorry I don\'t understand.  Please say your response again';
const skillName='The Best Darn Girls'
const goodbyeSpeak='Please come back or visit The Best Darn Girls Movie Review website at https:// that darn girl movie dot reviews. Good bye!'
const goodbyeScreen='Please visit https://thatdarngirlmovie.reviews'
const mainMenu='For the latest reviews of movies in the theater, say In The Theater.  For the latest TV movies, say Made for TV.  For the Must Buy movie of the week, say Must Buy.  For Video on Demand reviews, say Video on Demand. To search The Best Darn Girls Library, say Library.'
const hints=[' show me ',' tell me about ', ' I choose ', ' select ', ' '];
const background='https://s3.amazonaws.com/thebestdarngirls/library/small-image/darkbluebg.jpeg';
const smallLogo='https://s3.amazonaws.com/thebestdarngirls/library/small-image/APP_ICON.png';
const largeLogo='https://s3.amazonaws.com/thebestdarngirls/library/large-image/APP_ICON.png';

var inTheTheater = require('./data/inTheTheater');
var madeForTV = require('./data/madeForTV');
var mustBuy = require('./data/mustBuy');
var videoOnDemand = require('./data/videoOnDemand');

var getOptions = require('./helpers/getOptions');
var getCardInfo = require('./helpers/getCardInfo');
var getList = require('./helpers/getList');

var menu;
var choice;

const WelcomeHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'LaunchRequest'
		  || (request.type === 'IntentRequest'
		  && request.intent.name === 'AMAZON.NavigateHomeIntent');
	},
	handle(handlerInput) {

		if(supportsAPL(handlerInput)){
		    handlerInput.responseBuilder.addDirective({
		        type : 'Alexa.Presentation.APL.RenderDocument',
		        document : Welcome,
		        datasources : {
                    "HomeTemplate":{
                        "type":"object",
                        "objectId":"ht",
                        "backgroundImage": {
                            "sources": Background
                        },
                        "title":"Main Menu",
                        "textContent":{
                            "primaryText": {
                                "type": "PlainText",
                                "text": mainScreen
                            }
                        },
                        "logoSmallUrl":smallLogo,
                        "logoLargeUrl":largeLogo

                    }
		        }
		    });
		}

		return handlerInput.responseBuilder
		  .speak(welcome)
		  .reprompt(mainMenu)
		  .withSimpleCard(skillName, mainOptions)
		  .getResponse();
	}
};

const MainMenuHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && request.intent.name === 'MenuSelection');
	},
	handle(handlerInput){
		if(handlerInput.requestEnvelope.request.intent.slots.menu){
			menu = handlerInput.requestEnvelope.request.intent.slots.menu.value;
		}

		var starter = "To hear a movie review, please pick the corresponding number.\n\n";
  		var requestList;
  		var isLibrary = false;

  		if(menu.toLowerCase() === 'in the theater'){
      		starter += getOptions(inTheTheater);
      		requestList = getList(inTheTheater);
  		}else if(menu.toLowerCase() === 'made for tv'){
      		starter += getOptions(madeForTV);
      		requestList = getList(madeForTV);
  		}else if(menu.toLowerCase() === 'must buy'){
  			starter += getOptions(mustBuy);
  			requestList = getList(mustBuy);
  		}else if(menu.toLowerCase() === 'video on demand'){
  			starter += getOptions(videoOnDemand);
  			requestList = getList(videoOnDemand)
  		}else if(menu.toLowerCase() === 'library'){
  		    starter = "Welcome to The Best Darn Girls Movie Review Library.  Please say \"Search For\" and the title of the movie";
  		    isLibrary = true
  		}else{
      		starter = `${sorry}`;
 		}

 		if(supportsAPL(handlerInput) && requestList){

 			var num = Math.floor(Math.random() * 5);
            var nextNum = num+1;
            var output = hints[num]+nextNum;

            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document : MovieOptions,
                datasources : {
                    "MovieOptionsTemplateMetadata": {
                        "type": "object",
                        "objectId": "moMetadata",
                        "backgroundImage": {
                            "sources": Background
                        },
                        "title": "Movie Options",
                        "logoSmallUrl":smallLogo,
                        "logoLargeUrl":largeLogo
                    },
                    "MovieOptionsListData": {
                        "type": "list",
                        "listId": "moList",
                        "totalNumberOfItems": 5,
                        "hintText": output,
                        "listPage": {
                            "listItems": requestList
                        }
                    }
                }
            });

 		}else if(supportsAPL(handlerInput) && isLibrary){
 		    handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document : LibraryWelcome,
                datasources : {
                    "WelcomeLibTemplate": {
                        "type": "object",
                        "objectId": "wlMetadata",
                        "backgroundImage": {
                            "sources": Background
                        },
                        "logoSmallUrl":smallLogo,
                        "logoLargeUrl":largeLogo,
                        "textContent": {
                            "primaryText":{
                                "type":"PlainText",
                                "text": starter
                            }
                        },
                        "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/cheeseskillicon.png",
                        "hintText": "Try, \"Search For Hailey Dean Mysteries\""
                    }
                }
            });
 		}

 		return handlerInput.responseBuilder
 		  .speak(starter)
 		  .reprompt(starter)
 		  .withSimpleCard(skillName, starter)
 		  .getResponse();
	}
};

const MovieChoicesHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && request.intent.name === 'MovieChoices')
		  || request.type === 'Display.ElementSelected';
	},
	handle(handlerInput){
		if (handlerInput.requestEnvelope.request.token) {
			choice = handlerInput.requestEnvelope.request.token;
		}else if(handlerInput.requestEnvelope.request.intent.slots.choice){
			choice = handlerInput.requestEnvelope.request.intent.slots.choice.value;
		}

    	var review = `${sorry}`;
    	var element;

  		if(menu.toLowerCase() === 'in the theater'){
  			element = getCardInfo(inTheTheater, choice);
	  	}else if(menu.toLowerCase() === 'made for tv'){
  			element = getCardInfo(madeForTV, choice);
 	 	}else if(menu.toLowerCase() === 'must buy'){
  			element = getCardInfo(mustBuy, choice);
	  	}else if(menu.toLowerCase() === 'video on demand'){
  			element = getCardInfo(videoOnDemand, choice);
  		}

    	if(element){
    		if(supportsAPL(handlerInput)){
 				handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document : Review,
                    datasources : {
                        "ReviewTemplate": {
                            "type": "object",
                            "objectId": "reviewSample",
                            "backgroundImage": {
                                "sources": Background
                            },
                            "title": "Movie Review",
                            "image": {
                                "smallSourceUrl": element.image.smallImageUrl,
                                "largeSourceUrl": element.image.largeImageUrl
                            },
                            "textContent":{
                                "title": {
                                    "type": "PlainText",
                                    "text": element.mtitle
                                },
                                "primaryText": {
                                    "type": "PlainText",
                                    "text": element.review
                                }
                            },
                            "logoSmall": smallLogo,
                            "logoLarge": largeLogo
                        }
                    }
                });

 			}

      		return handlerInput.responseBuilder
      		  .speak(element.review.replace(/<br\/>/g,'\n').concat(repeatGoBack))
      		  .reprompt(repeatGoBack)
      		  .withStandardCard(element.mtitle, element.review.replace(/<br\/>/g,'\n'), element.image.smallImageUrl, element.image.largeImageUrl)
      		  .getResponse();
      	}else{
      		return handlerInput.responseBuilder
      		.speak(review)
      		.getResponse();
    	}
	}
};

const LibraryHandler = {
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        return (request.type === 'IntentRequest'
          && request.intent.name === 'Library');
    },
    handle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        if (request.intent.slots.selection.value){
            choice = request.intent.slots.selection.value;
        }else if(request.intent.slots.query.value){
            choice = request.intent.slots.query.value;
        }

        lookUp.searching(aws, mysql, choice.toLowerCase().replace(/ /g,'%')).then(data => {
            console.log(data);

            var starter = "Here are your search results.  Please pick the corresponding number.\n\n";
            var requestList;

            var newData = JSON.parse(data);

            starter += getOptions(newData);
            requestList = getList(newData);

            if(supportsAPL(handlerInput) && requestList){

                var num = Math.floor(Math.random() * 5);
                var nextNum = num+1;
                var output = hints[num]+nextNum;

                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document : MovieOptions,
                    datasources : {
                        "MovieOptionsTemplateMetadata": {
                            "type": "object",
                            "objectId": "moMetadata",
                            "backgroundImage": {
                                "sources": Background
                            },
                            "title": "Search Results",
                            "logoSmallUrl":smallLogo,
                            "logoLargeUrl":largeLogo
                        },
                        "MovieOptionsListData": {
                            "type": "list",
                            "listId": "moList",
                            "totalNumberOfItems": requestList.length,
                            "hintText": output,
                            "listPage": {
                                "listItems": requestList
                            }
                        }
                    }
                });
                console.log("end of if "+requestList[0].listItemIdentifier);
            }
            console.log("returning "+starter);
            return handlerInput.responseBuilder
                .speak(starter)
             	.reprompt(starter)
             	.withSimpleCard(skillName, starter)
             	.getResponse();
        }).catch(err => {
            console.log(err+" fool");
        });
    }
}

const CommandsHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && request.intent.name === 'Commands');
	},
	handle(handlerInput){
		var com = handlerInput.requestEnvelope.request.intent.slots.command.value;

		if (com.toLowerCase() === 'goodbye'){
			return ExitHandler.handle(handlerInput);
		}else if(com.toLowerCase() === 'repeat'){
			return MovieChoicesHandler.handle(handlerInput);
		}else if(com.toLowerCase() === 'movie options'){
			return MainMenuHandler.handle(handlerInput);
		}else if(com.toLowerCase() === 'main menu'){
			return WelcomeHandler.handle(handlerInput);
		}else{
			if(supportsAPL(handlerInput)){
			    handlerInput.responseBuilder.addDirective({
 				    type : 'Alexa.Presentation.APL.RenderDocument',
 				    document : Welcome,
 				    datasources : {
 				        "HomeTemplate":{
 				            "type": "object",
 			    	        "objectId": "command",
 			    	        "backgroundImage": {
                                "sources": Background
                            },
 				            "title": "Main Menu",
 				            "textContent": {
 				                "primaryText": {
 				                    "type": "PlainText",
                                    "text": mainScreen
 		    		            }
 			    	        },
 				            "logoSmallUrl":smallLogo,
                            "logoLargeUrl":largeLogo
 				        }
 				    }
			    });
            }
			return handlerInput.responseBuilder
      		.speak("Sorry, your response was not understood.  Going back to the main menu.  " + mainMenu)
      		.getResponse();
		}
	}
};

const ExitHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'IntentRequest'
		  && (request.intent.name === 'AMAZON.CancelIntent'
		  || request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		if(supportsAPL(handlerInput)){
		    handlerInput.responseBuilder.addDirective({
		        type : 'Alexa.Presentation.APL.RenderDocument',
		        document : Welcome,
		        datasources : {
		            "HomeTemplate":{
		                "type": "object",
		                "objectId": "exit",
		                "backgroundImage": {
                           "sources": Background
                        },
		                "title": "Good Bye",
		                "textContent": {
		                    "primaryText": {
		                        "type": "PlainText",
		                        "text": goodbyeScreen
		                    }
		                },
		                "logoSmallUrl":smallLogo,
                        "logoLargeUrl":largeLogo
		            }
		        }
		    });
		}

		return handlerInput.responseBuilder
		  .speak(goodbyeSpeak)
		  .withSimpleCard(skillName,goodbyeScreen)
		  .getResponse();
	}
};

const HelpHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'IntentRequest'
		  && request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput){
		var helpMessage = "This is an Alexa app for The Best Darn Girls Movie Review website.  It will give a brief overview of the last 5 movies reviewed along with a short critique and a rating.  For an indepth review, go to https:// that darn girl movie dot reviews.  "
		var helpScreen = "This is an Alexa app for The Best Darn Girls Movie Review website.  It will give a brief overview of the last 5 movies reviewed along with a short critique and a rating.  For an indepth review, go to https://thatdarngirlmovie.reviews.<br/><br/>"

		if(supportsAPL(handlerInput)){
            handlerInput.responseBuilder.addDirective({
        	    type : 'Alexa.Presentation.APL.RenderDocument',
        		document : Welcome,
        		datasources : {
        		    "HomeTemplate":{
            		    "type": "object",
            		    "objectId": "help",
        	    	    "backgroundImage": {
                            "sources": Background
                        },
        		        "title": "Help and Main Menu",
            		    "textContent": {
            		        "helpText": {
            		            "type": "PlainText",
            		            "text": helpScreen
            		        },
                  		    "primaryText": {
            	    	        "type": "PlainText",
        	    	            "text": mainScreen
        		            }
        		        },
            		    "logoSmallUrl":smallLogo,
                        "logoLargeUrl":largeLogo
        	        }
                }
            });
        }

		return handlerInput.responseBuilder
	  	  .speak(helpMessage.concat(welcome))
	  	  .reprompt(mainOptions)
	  	  .withSimpleCard(skillName, mainOptions)
	  	  .getResponse();
	}
};

const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'SessionEndedRequest';
	},
	handle(handlerInput){
		console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

		return handlerInput.responseBuilder.getResponse();
	}
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error){
	  console.log(`Error handled: ${error.message}`);

	  return handlerInput.responseBuilder
	    .speak('Sorry, an error occurred.')
	    .reprompt('Sorry, an error occurred.')
	    .getResponse();
	}
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    WelcomeHandler,
    MainMenuHandler,
    MovieChoicesHandler,
    CommandsHandler,
    LibraryHandler,
    ExitHandler,
    HelpHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

  // returns true if the skill is running on a device with a display (show|spot)
function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface != null && aplInterface != undefined;
}
