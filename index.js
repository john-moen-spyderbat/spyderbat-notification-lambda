var aws = require("aws-sdk");
var ses = new aws.SES({ region: "YOUR_SES_AWS_REGION" });

exports.handler = async function (event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 4));
    var message = event.Records[0].Sns.Message;
    var parsedMessage = {};
    try {
        parsedMessage = JSON.parse(message);
        console.log('parsedMessage:', parsedMessage);
    } catch (e) {
        console.error('Could not parse message as JSON! message:', message);
    }

    try {
        // first element is an object with shape: {total_hits: #}, subsequent elements are Spyderbat records
        var totalRecords = parsedMessage?.records?.[0]?.total_hits;
        var orgUid = parsedMessage?.org_uid ?? '';
        var rawMessage = parsedMessage?.message ?? '';
        var isTestNotificationFromSpyderbat = rawMessage === 'This is a test notification.';
        var emailSubject = event.Records[0].Sns.Subject;
        var searchTimeDurationInSeconds = parsedMessage?.data?.dashboardsearch?.notify_frequency;
        var searchValidFrom = parsedMessage?.valid_from;
        var searchStartDate = new Date(searchValidFrom);
        var searchStartTimeInSeconds = searchStartDate.getTime() / 1000;
        var searchEndTimeInSeconds = searchStartTimeInSeconds + searchTimeDurationInSeconds;
        var searchTerm = parsedMessage?.data?.dashboardsearch?.search;
        var uriEncodedSearchTerm = encodeURIComponent(searchTerm);
        var urlParamString = `?term=${uriEncodedSearchTerm}&startTs=${searchStartTimeInSeconds}&endTs=${searchEndTimeInSeconds}`;
        var searchUrl = `https://kangaroobat.net/app/org/${orgUid}/search${urlParamString}`;
        var notificationHtml = `Total records: ${totalRecords}<br/>Link to results on Search page: <a href=\"${searchUrl}\" target=\"_blank\">${searchUrl}</a>`;
        var notificationText = `Total records: ${totalRecords} /n Link to results on Search page: ${searchUrl}`;

    } catch (e) {
        console.error('Failed to initialize variables:', message);
        return;
    }

    var params = {
        Destination: {
            ToAddresses: ["YOUR_SES_VERIFIED_EMAIL_ADDRESS_TO_SEND_TO"],
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: isTestNotificationFromSpyderbat ? rawMessage : notificationHtml
                },
                Text: {
                    Charset: "UTF-8",
                    Data: isTestNotificationFromSpyderbat ? rawMessage : notificationText
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: emailSubject
            }
        },
        Source: "YOUR_SES_VERIFIED_EMAIL_ADDRESS_TO_SEND_FROM",
    };

    var sendEmailPromise = ses.sendEmail(params).promise();
    sendEmailPromise.then(function (data) {
        console.log('Email Success!', data);
    }).catch(function (err) {
        console.log('Email failed', err);
    });
    return sendEmailPromise;
};
