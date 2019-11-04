const aws = require('aws-sdk');
const RDS = new aws.RDSDataService();

const Alexa = require('ask-sdk-core');
const Welcome = require('./json/welcome.json');
const LibraryWelcome = require('./json/librarywelcome.json');
const MovieOptions = require('./json/movieoptions.json');
const Review = require('./json/review.json');
const Background = require('./json/background.json');

const welcome = 'Welcome to The Best Darn Girls Movie Reviews on Alexa.  For the latest reviews of movies in the theater, say In The Theater.  For the latest TV movies, say Made for TV.  For the top rated movies in stores, say In Stores.  For Video on Demand reviews, say Video on Demand. For movies not yet in the theater, say Early Screening. To search The Best Darn Girls Library, say Library.';
const mainOptions = '\t* In The Theater\n\t* Made For TV\n\t* In Stores\n\t* Video On Demand\n\t* Early Screening - Premium Access Only\n\t* Library - Premium Access Only';
const mainScreen = '* In The Theater<br/>* Made for TV<br/>* In Stores<br/>* Video On Demand<br/>* Early Screening - Premium Access Only<br/>* Library - Premium Access Only';
const repeatGoBack = '  To hear the review again, say repeat.  To go back to the movie options, say movie options.  To go back to the main menu, say main menu.  To exit, say good bye';
const sorry = 'Sorry I don\'t understand.  Say your response again';
const skillName='The Best Darn Girls'
const goodbyeSpeak='Come back or visit The Best Darn Girls Movie Review website at https:// that darn girl movie dot reviews. Good bye!'
const goodbyeScreen='* Site: https://thatdarngirlmovie.reviews<br/>* Instagram: @thebestdarngirls<br/>* Twitter: @thebestdarngirl<br/>* Facebook: @thebestdarngirls<br/>* Email: thebestdarngirls@gmail.com'
const goodbyeCard='\t* Site: https://thatdarngirlmovie.reviews\n\t* Instagram: @thebestdarngirls\n\t* Twitter: @thebestdarngirl\n\t* Facebook: @thebestdarngirls\n\t* Email: thebestdarngirls@gmail.com'
const mainMenu='For the latest reviews of movies in the theater, say In The Theater.  For the latest TV movies, say Made for TV.  For the top rated movies in stores, say In Stores.  For movies not yet in the theater, say Early Screening.   For Video on Demand reviews, say Video on Demand. To search The Best Darn Girls Library, say Library.'
const hints=[' Show Me ',' Tell Me About ', ' I Choose ', ' Select ', ' '];
const libHints=['Look for', 'Look up', 'Find', 'How about', 'Search for' ];
const smallLogo='https://s3.amazonaws.com/thebestdarngirls/library/small-image/APP_ICON.png';
const largeLogo='https://s3.amazonaws.com/thebestdarngirls/library/large-image/APP_ICON.png';

let inTheTheater = require('./data/inTheTheater');
let madeForTV = require('./data/madeForTV');
let mustBuy = require('./data/mustBuy');
let videoOnDemand = require('./data/videoOnDemand');
let earlyScreening = require('./data/earlyScreening');
let libraryList;

let getOptions = require('./helpers/getOptions');
let getCardInfo = require('./helpers/getCardInfo');
let getList = require('./helpers/getList');

let menu;
let searchChoice = "";
let choice;
let repeat=false
let offset=0;

let product = null;

const WelcomeHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'LaunchRequest'
			|| (request.type === 'IntentRequest'
			&& request.intent.name === 'AMAZON.NavigateHomeIntent');
	},
	handle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;
		if (supportsAPL(handlerInput)) {
			handlerInput.responseBuilder.addDirective({
				type: 'Alexa.Presentation.APL.RenderDocument',
				document: Welcome,
				datasources: {
					"HomeTemplate": {
						"type": "object",
						"objectId": "ht",
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
						"logoSmallUrl": smallLogo,
						"logoLargeUrl": largeLogo

					}
				}
			});
		}
		repeat=false;

		return handlerInput.responseBuilder
			.speak(welcome)
			.reprompt(mainMenu)
			.withSimpleCard(skillName, mainOptions)
			.getResponse();

	}

};

function isProduct(product)
{
  return product && product.length > 0;
}

function isEntitled(product)
{
  return isProduct(product) && product[0].entitled == 'ENTITLED';
}

const MainMenuHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && request.intent.name === 'MenuSelection');
	},
	handle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		if(request.intent.slots.menu){
			menu = request.intent.slots.menu.value;
		}

		let starter = "To hear a movie review, pick the corresponding number.\n\n";
  		let requestList;
		let isLibrary = false;
		  
		const locale = request.locale;
		const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		
		console.log(locale);
		console.log(ms);

		return ms.getInSkillProducts(locale).then(function(res) {
			console.log("in return");
			console.log(process.env.productName);
			product = res.inSkillProducts.filter(record => record.referenceName == process.env.productName);
			console.log(product);
  			if(menu.toLowerCase() === 'in the theater'){
      			starter += getOptions(inTheTheater);
 	     		requestList = getList(inTheTheater);
  			}else if(menu.toLowerCase() === 'made for tv'){
      			starter += getOptions(madeForTV);
      			requestList = getList(madeForTV);
 	 		}else if(menu.toLowerCase() === 'in stores'){
  				starter += getOptions(mustBuy);
  				requestList = getList(mustBuy);
 	 		}else if(menu.toLowerCase() === 'video on demand'){
  				starter += getOptions(videoOnDemand);
				requestList = getList(videoOnDemand);
			}else if(menu.toLowerCase() === 'early screening'){
				console.log("in early screening");
				if(isEntitled(product)){
					console.log("entitled");
					starter += getOptions(earlyScreening);
					requestList = getList(earlyScreening);
				}else{
					console.log("not entitled");
					const upsell = "To hear early screening reviews, you must own Premium Access.  Do you want to learn more?"

					return handlerInput.responseBuilder
						.addDirective({
							'type': 'Connections.SendRequest',
							'name':'Upsell',
							'payload': {
								'InSkillProduct': {
									'productId': product[0].productId
								},
								'upsellMessage': upsell
							},
							'token': 'correlationToken'
						}).getResponse();
				}
  			}else if(menu.toLowerCase() === 'library'){
				if(isEntitled(product)){
  		    		if(repeat == true){
						repeat=false;
						return LibraryHandler.handle(handlerInput);
  		    		}else{
  		 	        	starter = "Welcome to The Best Darn Girls Movie Review Library.  Say \""+ getRandomNumber(libHints, libHints.length, false) + "\" and the title of the movie";
 	 		    	    isLibrary = true;
						isEnd=false;
						repeat = false;
						searchChoice = "";
  		        		offset=0;
					}
				}else{
					const upsell = "Before you can search the library, you must own Premium Access.  Do you want to learn more?"

					return handlerInput.responseBuilder
						.addDirective({
							'type': 'Connections.SendRequest',
							'name':'Upsell',
							'payload': {
								'InSkillProduct': {
									'productId': product[0].productId
								},
								'upsellMessage': upsell
							},
							'token': 'correlationToken'
						}).getResponse();
				}
  			}else{
      			starter = `${sorry}`;
 			}

 			if(supportsAPL(handlerInput) && requestList){

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
        	                "totalNumberOfItems": requestList.length,
            	            "hintText": getRandomNumber(hints, requestList.length, true),
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
                   	    "hintText": "Try, \""+ getRandomNumber(libHints, libHints.length, false) + "\" Hailey Dean Mysteries\""
	                    }
    	            }
        	    });
 			}

 		return handlerInput.responseBuilder
 		  .speak(starter)
 		  .reprompt(starter)
 		  .withSimpleCard(skillName, starter)
 		  .getResponse();
		})
	}
};

const WhatCanIBuyHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && (request.intent.name === 'WhatCanIBuy'
		  || request.intent.name === 'BuyIntent' ));
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return ms.getInSkillProducts(locale).then(function(res) {
			product = res.inSkillProducts.filter(record => record.referenceName == process.env.productName);

			if (isEntitled(product)){
				if (supportsAPL(handlerInput)) {
					handlerInput.responseBuilder.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						document: Welcome,
						datasources: {
							"HomeTemplate": {
								"type": "object",
								"objectId": "ht",
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
								"logoSmallUrl": smallLogo,
								"logoLargeUrl": largeLogo
		
							}
						}
					});
				}

				const speakResponse = "You have Premium Access.  There are no other products to purchase.  ";

				return handlerInput.responseBuilder
				  .speak(speakResponse + " " + mainMenu)
				  .reprompt(welcome)
				  .getResponse();
			}else{
				return handlerInput.responseBuilder
				.addDirective({
					'type': 'Connections.SendRequest',
					'name': 'Buy',
					'payload':{
						'InSkillProduct': {
							'productId': product[0].productId
						}
					},
					'token': 'correlationToken'
				})
				.getResponse();
			}
		})
	}
}

const CancelPurchaseHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'IntentRequest'
		    && request.intent.name === 'CancelPurchaseIntent';
	},
	async handle(handlerInput){

		const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return ms.getInSkillProducts(handlerInput.requestEnvelope.request.locale).then((res) => {
			const product = res.inSkillProducts.filter(record => record.referenceName === process.env.productName);
			if(isEntitled(product)){
				return handlerInput.responseBuilder
				  .addDirective({
					  'type': 'Connections.SendRequest',
					  'name': 'Cancel',
					  'payload':{
						  'InSkillProduct': {
							  'productId': product[0].productId,
						  },
					  },
					  'token': 'correlationToken',
				  })
				  .getResponse();
			}else{
				if(supportsAPL(handlerInput)){
					handlerInput.responseBuilder.addDirective({
						type: 'Alexa.Presentation.APL.RenderDocument',
						document: Welcome,
						datasources: {
							"HomeTemplate": {
								"type": "object",
								"objectId": "ht",
								"backgroundImage":{
									"sources": Background
								},
								"title": "Main Menu",
								"textContent":{
									"primaryText": {
										"type": "PlainText",
										"text": mainScreen
									}
								},
								"logoSmallUrl": smallLogo,
								"logoLargeUrl": largeLogo
							}
						}
					});
				}

				const speakResponse = "You do not own Premium Access.  If you would like to purchase it say, Alexa ask The Best Darn Girls to purchase Premium Access.  ";
				return handlerInput.responseBuilder
				  .speak(speakResponse + " " + mainMenu)
				  .reprompt(welcome)
				  .getResponse();

			}
		});
	},
};

const UpsellResponseHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;

		return request.type === 'Connections.Response'
		  && (request.name === 'Upsell' || request.name === 'Buy');
	},
	handle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		if(request.status.code = 200) {
			if (supportsAPL(handlerInput)) {
				handlerInput.responseBuilder.addDirective({
					type: 'Alexa.Presentation.APL.RenderDocument',
					document: Welcome,
					datasources: {
						"HomeTemplate": {
							"type": "object",
							"objectId": "ht",
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
							"logoSmallUrl": smallLogo,
							"logoLargeUrl": largeLogo
	
						}
					}
				});
			}

			if(request.payload.purchaseResult == 'DECLINED'){
				const speakResponse = "You cannot search the library or hear early screening reviews without Premium Access.  However, you can still get the latest reviews.  If you would like to purchase Premium Access say, Alexa ask The Best Darn Girls to purchase Premium Access.  ";

				return handlerInput.responseBuilder
				  .speak(speakResponse + " " + mainMenu)
				  .reprompt(welcome)
				  .getResponse();
			}else if(request.payload.purchaseResult == 'ACCEPTED'){
				const speakResponse = "Congratulations, you have Premium Access!  You can search the library and have access to exclusive reviews.  Happy searching!";
				return handlerInput.responseBuilder
				  .speak(speakResponse + " " + mainMenu)
				  .reprompt(welcome)
				  .getResponse();
			}
		}else{
			console.log("Connections.Response failure.  Error is: " + request.status.message);
			return handlerInput.responseBuilder
			  .speak("I did not understand.  Say your response again.")
			  .getResponse();
		}
	}
}

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

    	let review = `${sorry}`;
    	let element;

  		if(menu.toLowerCase() === 'in the theater'){
  			element = getCardInfo(inTheTheater, choice);
	  	}else if(menu.toLowerCase() === 'made for tv'){
  			element = getCardInfo(madeForTV, choice);
 	 	}else if(menu.toLowerCase() === 'in stores'){
  			element = getCardInfo(mustBuy, choice);
	  	}else if(menu.toLowerCase() === 'video on demand'){
			element = getCardInfo(videoOnDemand, choice);
		}else if(menu.toLowerCase() === 'early screening'){
			element = getCardInfo(earlyScreening, choice);
  		}else if(menu.toLowerCase() === 'library'){
  		    element = getCardInfo(libraryList, choice);
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
      		  .speak(element.review.replace(/<br\/>/g,'\n').replace(/_/g,'\n').concat(repeatGoBack))
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
    async handle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        if(request.intent.slots && offset == 0){
			if(request.intent.slots.selection != null && request.intent.slots.query != null){
           		if (request.intent.slots.selection.value != null){
                	choice = request.intent.slots.selection.value;
            	}else if(request.intent.slots.query.value != null){
                	choice = request.intent.slots.query.value;
            	}
			}
		}
		let rows;
		let parsedChoice;


		if(request.intent.slots != null){
			if(request.intent.slots.selection != null || request.intent.slots.query != null){
				parsedChoice = choice.toLowerCase().replace('/ /g','%');
				searchChoice = parsedChoice;
			}else{
				parsedChoice = searchChoice;
			}
		}else{
			parsedChoice = searchChoice;
		}
		
		let starter = null;
		try{

			const paramsSecond = {
				secretArn: process.env.secretArn,
				resourceArn: process.env.resourceArn,
				sql: `select count(id) as count from reviews where title like :title`,
				parameters:[
					{
						name: 'title',
						value:{
							"stringValue": '%'+parsedChoice+'%'
						}
					}
				],
				database: process.env.database
			}// end paramSecond

			//get number of rows
			let retRowCount = await RDS.executeStatement(paramsSecond).promise();
			let rowCount = retRowCount.records[0][0]['longValue'];

			let phrase = "";

			if(offset < 0){
				offset = 0;
				phrase = "You are at the beginning of your search.  Please, make your selection.  ";
			}

			if(offset >= rowCount && rowCount != Number(0)){
				offset = offset - 10;
            	phrase = "You are at the end of your search.  Please, make your selection.  ";
			}

			const paramsFirst = {
				secretArn: process.env.secretArn, 
				resourceArn: process.env.resourceArn, 
				sql: `select * from reviews where title like :title order by title limit 10 offset :offset`,
				parameters:[
					{
						name: 'title',
						value: {
							"stringValue": '%'+parsedChoice+'%'
						}
					},
					{
						name: 'offset',
						value: {
							"longValue": offset
						}
					}
				], //end params
				database: process.env.database
			} //end const paramsFirst
			let rowReturns = await RDS.executeStatement(paramsFirst).promise();
			rows = parseResults(rowReturns, rowCount, phrase);

		}catch(e){
			console.log(e);
			return ErrorHandler.handle(handlerInput);
		} //end try catch block
		const locale = request.locale;
		const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		
		return ms.getInSkillProducts(locale).then(function(res) {
		product = res.inSkillProducts.filter(record => record.referenceName == process.env.productName);
			if(isEntitled(product)){
				if(supportsAPL(handlerInput) && rows[0] != ""){

        		    starter = rows[0];
		            let requestList = rows[1];
        		    libraryList = rows[2];

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
 		                        "hintText": getRandomNumber(hints, requestList.length, true),
        		                "listPage": {
		                            "listItems": requestList
        		                }
                		    }
		                }
        		    }); //end handler
		        }else if(supportsAPL(handlerInput) && rows[0] == "" && offset == 0){
        		    starter = "Your search has returned 0 results.   You can request another search by saying " + getRandomNumber(libHints, libHints.length, false) + " and a movie title or say main menu.";

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
		                        "hintText": "Try, \""+ getRandomNumber(libHints, libHints.length, false) + "\" Hailey Dean Mysteries\""
        		            }
                		}
            		});
        		}

        		return handlerInput.responseBuilder
        			.speak(starter)
		        	.reprompt(starter)
        			.withSimpleCard(skillName, starter)
        			.getResponse();
    		}else{
				const upsell = "To seach the library, you must own Premium Access.  Do you want to learn more?"
				return handlerInput.responseBuilder
					.addDirective({
						'type': 'Connections.SendRequest',
						'name':'Upsell',
						'payload': {
							'InSkillProduct': {
								'productId': product[0].productId
							},
							'upsellMessage': upsell
						},
						'token': 'correlationToken'
					}).getResponse();
			
			}

		})
	}
};

const CommandsHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && request.intent.name === 'Commands');
	},
	handle(handlerInput){
		let com = handlerInput.requestEnvelope.request.intent.slots.command.value;

		if(com.toLowerCase() === 'repeat'){
		    repeat=true;
			return MovieChoicesHandler.handle(handlerInput);
		}else if(com.toLowerCase() === 'movie options'){
			repeat=true;
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

const PrevHandler = {
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
          && (request.intent.name === 'AMAZON.PreviousIntent');
    },
    handle(handlerInput) {
            offset=offset-10;
            return LibraryHandler.handle(handlerInput);
    }
}

const NextHandler = {
    canHandle(handlerInput){
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
          && (request.intent.name === 'AMAZON.NextIntent');
    },
    handle(handlerInput) {
        offset=offset+10;
        return LibraryHandler.handle(handlerInput);
    }
}

const ExitHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return (request.type === 'IntentRequest'
		  && (request.intent.name === 'AMAZON.CancelIntent'
		  || request.intent.name === 'AMAZON.StopIntent')) 
		  ||
		  (request.type === 'Connections.Response' 
		  && request.name === 'Cancel');
	},
	handle(handlerInput) {
		const request = handlerInput.requestEnvelope.request;

		if(request.type === 'IntentRequest'){
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
		  .withSimpleCard(skillName,goodbyeCard)
		  .withShouldEndSession(true)
		  .getResponse();
		}else if(request.type === 'Connections.Response'){
			let speakResponse = null;
			if (supportsAPL(handlerInput)) {
				handlerInput.responseBuilder.addDirective({
					type: 'Alexa.Presentation.APL.RenderDocument',
					document: Welcome,
					datasources: {
						"HomeTemplate": {
							"type": "object",
							"objectId": "ht",
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
							"logoSmallUrl": smallLogo,
							"logoLargeUrl": largeLogo

						}
					}
				});
			}

			if(request.payload.purchaseResult === 'ACCEPTED'){
				speakResponse = "I am sorry to see you go.  You can renew your Premium Access in the future.  ";			
			}else if(request.payload.purchaseResult === 'DECLINED'){
				speakResponse = "You still have Premium Access.  ";
			}else{
				speakResponse = "I did not understand.  Say your response again."
			}

			return handlerInput.responseBuilder
           		.speak(speakResponse + " " + mainMenu)
           		.reprompt(welcome)
           		.getResponse();
		}else{
			return handlerInput.responseBuilder
    	       .speak("I did not understand.  Say your response again.")
        	   .getResponse();
		}
	}
};

const HelpHandler = {
	canHandle(handlerInput){
		const request = handlerInput.requestEnvelope.request;
		return request.type === 'IntentRequest'
		  && request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput){
		let helpMessage = "This is an Alexa app for The Best Darn Girls Movie Review website.  It will give a brief overview of the last 5 movies reviewed along with a short critique and a rating.  To search the app's library or gain access to exclusive reviews, you must purchacse Premium Access.  For an indepth review, go to https:// that darn girl movie dot reviews.  "
		let helpScreen =  "This is an Alexa app for The Best Darn Girls Movie Review website.  It will give a brief overview of the last 5 movies reviewed along with a short critique and a rating.  To search the app's library or gain access to exclusive reviews, you must purchacse Premium Access.  For an indepth review, go to https://thatdarngirlmovie.reviews.<br/><br/>  "

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
	CancelPurchaseHandler,
	ExitHandler,
	UpsellResponseHandler,
	WhatCanIBuyHandler,
    PrevHandler,
    NextHandler,
	HelpHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();

  // returns true if the skill is running on a device with a display (show|spot)
function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface != null && aplInterface != undefined;
}

function getRandomNumber(array, length, ifNext){
    let num = Math.floor(Math.random() * length);
    let nextNum = num+1;

    if(ifNext){
        return array[num]+nextNum;
    }else{
        return array[num]
    }
}

function parseResults(rowReturns, rowCount, phrase){
	let resultString = "[";
	let count = 1;
	let newData = null;
	let starter = phrase;
	let requestList = null;

	
	//creates the JSON String to create movie listing
	rowReturns.records.forEach(function(obj){
		let keys = Object.keys(obj);
		let myMtitle = obj[keys[1]]['stringValue']; let myReview = obj[keys[4]]['blobValue'];
		let myRating = obj[keys[2]]['doubleValue']; let myImage = obj[keys[3]]['stringValue'];

		resultString += "{\n\"option\":\""+count+"\",\n\"mtitle\":\""+ myMtitle+"\",\n\"review\":\""+myReview+"<br/><br/>"+myRating+" out of 5 stars.\",\n\"image\":{\n\"smallImageUrl\":\"https://thebestdarngirls.s3.amazonaws.com/library/small-image/"+myImage+"\",\n\"largeImageUrl\":\"https://thebestdarngirls.s3.amazonaws.com/library/small-image/"+myImage+"\"\n}\n},";
		count = count + 1;
	});

	
	//removes the last comma and adds a braket
	resultString = resultString.slice(0,-1);
	resultString += "]";
	
	if(rowCount != 0){
		//parse JSON from string
		newData = JSON.parse(resultString);

		if(rowCount == Number(1)){
			starter += "You have one result.  Pick the corresponding number.\n\n";
		}else if(rowCount > Number(10) && offset == Number(0)){
			starter += "You have "+rowCount+" results.  Here are your first 10 results. For the next 10, say skip.  Pick the corresponding number.\n\n";
		}else if(rowCount > Number(10) && ((offset + 10) >= rowCount)){
			starter += "You have "+rowCount+" results.  Here are your final results.  For the previous 10, say previous.  Pick the corresponding number.\n\n";
		}else if(rowCount > 10 && offset > 0){
			starter += "You have "+rowCount+" results.  Here are your next 10 results.  For the more results, say skip.  For the previous 10, say previous.  Pick the corresponding numbers.\n\n";
		}else{
			starter += "You have "+rowCount+" results.  Pick the corresponding number.\n\n";
		}

		starter += getOptions(newData);
		requestList = getList(newData);
	}

	return [starter, requestList, newData];
}
