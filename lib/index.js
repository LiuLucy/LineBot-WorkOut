"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const bot_sdk_1 = require("@line/bot-sdk");
const Dialogflow = require("apiai");
const MomentZone = require("moment-timezone");
const memberService = require("./services/memberService");
const groupService = require("./services/groupService");
const submitReportService = require("./services/submitReportService");
const praticeService = require("./services/praticeService");
const chatbaseService = require("./services/chatbaseService");
const sheetColumn_1 = require("./sheetColumn");
const chatbotConfig_1 = require("./chatbotConfig");
const lineClient = new bot_sdk_1.Client({
    channelSecret: chatbotConfig_1.LINE.channelSecret,
    channelAccessToken: chatbotConfig_1.LINE.channelAccessToken
});
const dialogflowAgent = Dialogflow(chatbotConfig_1.DIALOGFLOW.agentToken);
exports.timeConstrain = true;
exports.webhook = functions.https.onRequest((req, res) => {
    const signature = req.headers["x-line-signature"];
    if (bot_sdk_1.validateSignature(JSON.stringify(req.body), chatbotConfig_1.LINE.channelSecret, signature)) {
        const events = req.body.events;
        events.forEach(event => eventDispatcher(event));
    }
    res.sendStatus(200);
});
const eventDispatcher = (event) => {
    const userId = event.source.userId;
    switch (event.type) {
        case "follow":
            replyFollowMessage(event.replyToken, userId);
            break;
        case "unfollow":
            unfollow(userId);
            break;
        case "join":
            if (event.source.type == "group")
                replyJoinMessage(event.replyToken, event.source.groupId);
            break;
        case "leave":
            if (event.source.type == "group")
                leave(event.source.groupId);
            break;
        case "message":
            if (event.message.type === "text") {
                const message = event.message.text;
                if (event.source.type == "group")
                    chatbaseService.sendMessageToChatBase(userId, message, "discuss", "Line", "user", "Group");
                else
                    messageDispatcher(userId, event.message.text);
            }
            break;
        default:
            break;
    }
};
const replyFollowMessage = (replyToken, userId) => __awaiter(this, void 0, void 0, function* () {
    const lineMessage = {
        type: "text",
        text: "歡迎加入WorkOut\n過程中你可以透過我來紀錄運動的瑣碎事情，和朋友一起互相監督吧！\n當然了！我也會提醒你喔。"
    };
    yield replyMessage(replyToken, lineMessage);
    setDialogflowEvent(userId, "askForName");
});
const unfollow = (userId) => __awaiter(this, void 0, void 0, function* () {
    const member = yield memberService.getMember(userId);
    memberService.deleteMember(member);
});
const replyJoinMessage = (replyToken, groupId) => {
    const url = `https://docs.google.com/forms/d/e/1FAIpQLSd6_4pL6hy9lb5UPSe2lEItQINdVwW4MLOLkuDYygrhC8nWBg/viewform?usp=pp_url&entry.929266669=${groupId}`;
    const lineMessage = {
        type: "text",
        text: `運動一群人們\n很高興受邀加入到你的群組【${groupId}】\n\n為了更瞭解你，幫我填填表單吧`
    };
    const buttonsMessage = {
        type: "template",
        altText: "This is a buttons template",
        template: {
            type: "buttons",
            title: "運動中心",
            text: "表單填寫",
            actions: [
                {
                    type: "uri",
                    label: "點擊填寫",
                    uri: url
                }
            ]
        }
    };
    return replyMessage(replyToken, [lineMessage, buttonsMessage]);
};
const leave = (groupId) => __awaiter(this, void 0, void 0, function* () {
    const group = yield groupService.getGroup(groupId);
    groupService.deleteGroup(group);
});
const messageDispatcher = (userId, message) => {
    const request = dialogflowAgent.textRequest(message, { sessionId: userId });
    request.on("response", response => {
        actionDispatcher(userId, response.result);
        chatbaseService.sendMessageToChatBase(userId, response.result.resolvedQuery, response.result.metadata.intentName, "Line", "user");
    }).end();
    request.on("error", error => console.log("Error: ", error));
};
const setDialogflowEvent = (userId, eventName, eventParameter) => __awaiter(this, void 0, void 0, function* () {
    const request = dialogflowAgent.eventRequest({
        name: eventName,
        data: eventParameter
    }, { sessionId: userId });
    request.on("response", response => {
        actionDispatcher(userId, response.result);
    }).end();
    request.on("error", error => console.log("Error: ", error));
});
const actionDispatcher = (userId, result) => {
    console.log(JSON.stringify(result, null, 4));
    const action = result.action;
    console.log("action : " + action);
    switch (action) {
        case "register.askForRegister":
            askForRegister(userId, result);
            break;
        case "attendClass":
            attendClass(userId, result);
            break;
        case "beginPractice":
            replyCarouselMessage(userId, result);
            break;
        case "endPractice":
            endPractice(userId, result);
            break;
        case "requestReport":
            requestReport(userId, result);
            break;
        case "submittedReport":
            submittedReport(userId, result);
            break;
        case "notSubmittedReport":
            notSubmittedReport(userId, result);
            break;
        case "BeginPracticeSelectProject":
            beginPractice(userId, result);
            break;
        case "serchWorkOutProkect":
            serchWorkOutProkect(userId, result);
        default:
            pushErrorMessage(userId, result);
            break;
    }
    resetPracticeState(userId);
};
const askForRegister = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const name = result.parameters.name;
    const member = yield memberService.getMemberByName(name);
    console.log(member);
    let url = "https://docs.google.com/forms/d/e/1FAIpQLSdiuNZ31cRlmH8o8_YQSqrQUhDE_uRq_l20Swad2zC6rx5ExQ/viewform?usp=pp_url";
    if (member)
        url += `&entry.1736022417=${member.name}&entry.25587017=${member.hight}&entry.1022594535=${member.weight}&entry.336451093=${member.sex}&entry.1776352645=${userId}`;
    else
        url += `&entry.1736022417=${name}&entry.1776352645=${userId}`;
    sendsticker(userId, "2", "150");
    const lineMessage = {
        type: "template",
        altText: "This is a buttons template",
        template: {
            type: "buttons",
            title: "運動中心 會員註冊",
            text: "請填寫你的基本資料",
            actions: [
                {
                    type: "uri",
                    label: "點擊填表",
                    uri: url
                }
            ]
        }
    };
    return pushMessage(userId, lineMessage);
});
const attendClass = (userId, result) => __awaiter(this, void 0, void 0, function* () {
});
const beginPractice = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const workOutProject = result.parameters.workOutProject;
    const responseText = result.fulfillment.messages[0].speech;
    const parameters = result.parameters;
    if (parameters.practice !== "" && parameters.begin !== "") {
        const member = yield memberService.getMember(userId);
        if ((yield canBeginPractice(member)) === "canBeginPractice") {
            memberService.updateMemberWorkState(member, "1");
            const now = MomentZone().tz("Asia/Taipei");
            yield praticeService.createPracticeRecord(member, now.format("Y/M/D HH:mm"), workOutProject);
            sendsticker(userId, "2", "505");
            const lineMessage = {
                type: "text",
                text: responseText.replace("{{beginTime}}", now.format("Y/M/D HH:mm"))
            };
            pushMessage(userId, lineMessage);
            chatbaseService.sendMessageToChatBase(userId, result.resolvedQuery, result.metadata.intentName, "Line", "user", "Practice");
        }
        else if ((yield canBeginPractice(member)) === "practicing") {
            let practiceRecord = yield memberService.getMemberPracticeRecord(member.name);
            sendsticker(userId, "2", "505");
            const lineMessage = [
                {
                    type: "text",
                    text: "開始運動了！！加油加油"
                },
                {
                    type: "text",
                    text: responseText.replace("{{beginTime}}", practiceRecord.beginTime)
                }
            ];
            pushMessage(userId, lineMessage);
        }
    }
    else
        pushErrorMessage(userId, result);
});
const endPractice = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const parameters = result.parameters;
    if (parameters.practice !== "" && parameters.end !== "") {
        const member = yield memberService.getMember(userId);
        if (canEndPractice(member)) {
            const responseText = result.fulfillment.messages[0].speech;
            updatePraticeRecord(member, responseText);
        }
        else {
            const lineMessage = {
                type: "text",
                text: "運動還沒開始！請點擊開始運動"
            };
            pushMessage(userId, lineMessage);
        }
    }
    else
        pushErrorMessage(userId, result);
});
const updatePraticeRecord = (member, responseText) => __awaiter(this, void 0, void 0, function* () {
    memberService.updateMemberWorkState(member, "0");
    const now = MomentZone().tz("Asia/Taipei");
    let practiceRecord = yield memberService.getMemberPracticeRecord(member.name);
    console.log("Have in");
    const range = `${sheetColumn_1.practiceRecordColumn.workspace}!${sheetColumn_1.practiceRecordColumn.endTime}${practiceRecord.id}:${sheetColumn_1.practiceRecordColumn.Calories}${practiceRecord.id}`;
    const values = [
        [
            now.format("Y/M/D HH:mm"),
            `=IF(INDIRECT("G"&ROW())<>"",TEXT(INDIRECT("G"&ROW())-INDIRECT("F"&ROW()),"h:mm"), "")`,
            `=ROUND(IF(\'實習紀錄\'!E:E="游泳", \'運動\'!B3 * \'實習紀錄\'!D:D *\'實習紀錄\'!H:H,IF(\'實習紀錄\'!E:E="拉筋運動", \'運動\'!B2 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H, IF(\'實習紀錄\'!E:E="慢跑", \'運動\'!B4 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H,IF(\'實習紀錄\'!E:E="跳舞", \'運動\'!B5 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H,"")))),0)`
        ]
    ];
    yield praticeService.updatePracticeRecord(range, values);
    practiceRecord = yield memberService.getMemberPracticeRecord(member.name);
    //const performance = await memberService.getMemberPerformance(member.name)
    console.log("practiceRecord: -----------------------" + practiceRecord);
    const lineMessage = {
        type: "text",
        text: responseText.replace("{{beginTime}}", practiceRecord.beginTime)
            .replace("{{endTime}}", practiceRecord.endTime)
            .replace("{{practiceTime}}", practiceRecord.practiceTime)
            .replace("{{workOutProject}}", practiceRecord.workOutProject)
            .replace("{{calories}}", practiceRecord.Calories)
    };
    pushMessage(member.lineId, lineMessage);
});
const requestReport = (userId, result) => {
    const responseText = result.fulfillment.messages[0].speech;
    const parameters = result.parameters;
    if (parameters.report !== "" && parameters.submit !== "") {
        const lineMessage = {
            type: "text",
            text: responseText
        };
        const confirmMessage = {
            type: "template",
            altText: "this is a confirm template",
            template: {
                type: "confirm",
                text: "確定上傳照片",
                actions: [
                    {
                        type: "message",
                        label: "是",
                        text: "是"
                    },
                    {
                        type: "message",
                        label: "否",
                        text: "否"
                    }
                ]
            }
        };
        pushMessage(userId, [lineMessage, confirmMessage]);
    }
    else
        pushErrorMessage(userId, result);
};
const submittedReport = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const parameters = result.parameters;
    if (parameters.report !== "" && parameters.submit !== "") {
        const member = yield memberService.getMember(userId);
        const now = MomentZone().tz("Asia/Taipei");
        const responseText = result.fulfillment.messages[0].speech;
        yield submitReportService.createSubmitRecord(member, now.format("Y/M/D HH:mm"));
        const performance = yield memberService.getMemberPerformance(member.name);
        const lineMessage = {
            type: "text",
            text: responseText.replace("{{submitTime}}", now.format("Y/M/D HH:mm"))
        };
        pushMessage(userId, lineMessage);
    }
    else
        pushErrorMessage(userId, result);
});
const notSubmittedReport = (userId, result) => {
    const lineMessage = {
        type: "text",
        text: result.fulfillment.messages[0].speech
    };
    pushMessage(userId, lineMessage);
};
const canAttend = (member) => __awaiter(this, void 0, void 0, function* () {
    if (exports.timeConstrain) {
        // let isClassTime = await environmentService.getClassTime()
        // if (isClassTime) {
        //     if (member.attendState == "1")
        //         return "attended"
        //     return "canAttend"
        // }
        return "notAtTheTime";
    }
    return "canAttend";
});
const canBeginPractice = (member) => __awaiter(this, void 0, void 0, function* () {
    // if (timeConstrain) {
    //     let isClassTime = await environmentService.getClassTime()
    //     if (isClassTime)
    //         return "notAtTheTime"
    // }
    if (member.workState != "0")
        return "practicing";
    else
        return "canBeginPractice";
});
const canEndPractice = (member) => {
    return member.workState != "0";
};
const resetPracticeState = (userId) => __awaiter(this, void 0, void 0, function* () {
    const member = yield memberService.getMember(userId);
    if (member.workState != "0")
        memberService.updateMemberWorkState(member, "1");
});
exports.sendPraticeAlert = functions.https.onRequest((req, res) => {
    const member = req.body.member;
    if (member.stateCode < 4) {
        // const lineMessage: TemplateMessage = {
        //     type: "template",
        //     altText: "《智能學堂》關心您",
        //     template: {
        //         type: "confirm",
        //         text: "實習還順利嗎？",
        //         actions: [
        //             {
        //                 type: "message",
        //                 label: "實習順利",
        //                 text: "實習順利"
        //             },
        //             {
        //                 type: "message",
        //                 label: "實習結束",
        //                 text: "實習結束"
        //             }
        //         ]
        //     }
        //}
        //pushMessage(member.lineId, lineMessage)
    }
    else {
        // let responseText = "實習結束\n\n"
        // responseText += "實習次數：{{practiceCount}}\n\n"
        // responseText += "開始時間：{{beginTime}}\n"
        // responseText += "結束時間：{{endTime}}\n\n"
        // responseText += "本次實習：{{practiceTime}}\n"
        // responseText += "累計時間：{{totalPracticeTime}}"
        // updatePraticeRecord(member, responseText)
    }
    res.sendStatus(200);
});
exports.pushTextMessage = functions.https.onRequest((req, res) => {
    const message = req.body.message;
    const lineId = req.body.lineId;
    const textMessage = {
        type: "text",
        text: message
    };
    pushMessage(lineId, textMessage);
    res.sendStatus(200);
});
exports.sendPerformanceReport = functions.https.onRequest((req, res) => __awaiter(this, void 0, void 0, function* () {
    const memberPerformance = req.body;
    yield Promise.all([sendReportToGroup(memberPerformance), sendReportToMembers(memberPerformance)]);
    res.sendStatus(200);
}));
const sendReportToGroup = (data) => __awaiter(this, void 0, void 0, function* () {
    const groups = (yield groupService.getGroups()).map(group => group.groupLineId);
    console.log(groups);
    const sorted = data.sort((a, b) => {
        if (parseInt(`${a.performance.boyWorkOutRank}`) < parseInt(`${b.performance.girlWorkOutRank}`))
            return -1;
        if (parseInt(`${a.performance.boyWorkOutRank}`) > parseInt(`${b.performance.boyWorkOutRank}`))
            return 1;
        return 0;
    });
    const now = MomentZone().tz("Asia/Taipei");
    const lineMessage = [{
            type: "text",
            text: `運動中心\n${now.format("M月D日")} 今日運動成果：`
        }];
    let message = "";
    for (let index = 0; index < sorted.length; index++) {
        const memberPerformance = sorted[index];
        message += `<${memberPerformance.performance.name}>\n` +
            `運動次數：${memberPerformance.performance.practiceCount}\n` +
            `運動的時間：${memberPerformance.performance.totalPracticeTime}\n`;
        if (index % 10 === 9) {
            lineMessage.push({
                type: "text",
                text: message
            });
            message = "";
        }
        else if (index !== sorted.length - 1)
            message += "\n\n";
    }
    if (message !== "") {
        lineMessage.push({
            type: "text",
            text: message
        });
    }
    console.log(lineMessage);
    groups.forEach(groupId => pushMessage(groupId, lineMessage));
});
const sendReportToMembers = (data) => {
    const promises = new Array();
    for (const memberPerformance of data) {
        const lineMessage = {
            type: "text",
            text: `${MomentZone().tz("Asia/Taipei").format("M月D日")} ${memberPerformance.performance.name}\n\n` +
                `運動次數：${memberPerformance.performance.practiceCount}\n` +
                `你運動總時數：${memberPerformance.performance.totalPracticeTime}\n` +
                `男生總時數：${memberPerformance.performance.boyWorkOutTime}\n` +
                `女生總時數${memberPerformance.performance.girlWorkOutTime}\n`
        };
        promises.push(pushMessage(memberPerformance.member.lineId, lineMessage));
    }
    return Promise.all(promises);
};
exports.sendWorkOutTime = (member) => {
    const lineMessage = {
        type: "text",
        text: `今天要記得去運動喔！`
    };
    return pushMessage(member.lineId, lineMessage);
};
exports.sendHealthReport = functions.https.onRequest((req, res) => __awaiter(this, void 0, void 0, function* () {
    const groups = (yield groupService.getGroups()).map(group => group.groupLineId);
    const lineMessage = {
        type: "text",
        text: `今天要記得去運動喔！`
    };
    groups.forEach(groupId => pushMessage(groupId, lineMessage));
    res.sendStatus(200);
}));
const pushCommandMessage = (userId) => {
    const lineMessage = {
        type: "text",
        text: `為了讓你方便，指令有： \n1.開始運動\n2. 結束運動\n3. 上傳照片`
    };
    return pushMessage(userId, lineMessage);
};
const pushErrorMessage = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const lineMessage = {
        type: "text",
        text: result.fulfillment.messages[0].speech.replace("{{message}}", result.resolvedQuery)
    };
    pushMessage(userId, lineMessage);
});
const replyMessage = (replyToken, lineMessage) => {
    return lineClient.replyMessage(replyToken, lineMessage);
};
const pushMessage = (userId, lineMessage) => {
    if (Array.isArray(lineMessage)) {
        for (const message of lineMessage) {
            if (message.type === "text")
                chatbaseService.sendMessageToChatBase(userId, message.text, "reply", "Line", "agent");
            else
                chatbaseService.sendMessageToChatBase(userId, `This is a ${message.type} template message`, "reply", "Line", "agent");
        }
    }
    else {
        if (lineMessage.type === "text")
            chatbaseService.sendMessageToChatBase(userId, lineMessage.text, "reply", "Line", "agent");
        else
            chatbaseService.sendMessageToChatBase(userId, `This is a ${lineMessage.type} template message`, "reply", "Line", "agent");
    }
    return lineClient.pushMessage(userId, lineMessage);
};
const replyCarouselMessage = (userId, result) => __awaiter(this, void 0, void 0, function* () {
    const requestTime = new Date().getTime();
    const lineMessage = {
        type: "text",
        text: `選擇你的運動項目`
    };
    lineClient.pushMessage(userId, lineMessage);
    const carouselMessage = {
        type: "template",
        altText: "this is a carousel template",
        template: {
            type: "carousel",
            columns: [
                {
                    thumbnailImageUrl: "https://i.imgur.com/ag34aln.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "慢跑：有益於心肺和血液循環。",
                    text: "跑的路程越長，消耗的熱量越大。",
                    actions: [
                        {
                            type: "postback",
                            label: "慢跑",
                            data: "action=signInCarousel&requestTime=" + requestTime,
                            text: "慢跑"
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/rF0LnIt.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "游泳：它是一項全身協調動作的運動，",
                    text: "對增強心肺功能，鍛鍊靈活性和力量都很有好處。",
                    actions: [
                        {
                            type: "postback",
                            label: "游泳",
                            data: "action=reportCarousel&requestTime=" + requestTime,
                            text: "游泳"
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/DEzj2dV.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "拉筋運動：幫助放鬆，增加睡眠品質。",
                    text: "做好全身主要肌肉的拉筋動作，保護身體，也會讓運動的效果更好。",
                    actions: [
                        {
                            type: "postback",
                            label: "拉筋運動",
                            data: "action=beginPracticeCarousel&requestTime=" + requestTime,
                            text: "拉筋運動",
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/Y2tgdyk.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "跳舞（快）：跳舞可以訓練你的整個身體，塑造一個完美的身型。",
                    text: "當你有一點空閒的時間，你可以在家放你最喜歡的音樂，舞動你的手和腳。",
                    actions: [
                        {
                            type: "postback",
                            label: "跳舞",
                            data: "action=endPracticeCarousel&requestTime=" + requestTime,
                            text: "跳舞"
                        }
                    ]
                }
            ],
            imageAspectRatio: "rectangle",
            imageSize: "cover"
        }
    };
    return pushMessage(userId, carouselMessage);
});
const sendsticker = (userId, packageId, stickerId) => {
    const lineStickerMessage = {
        "type": "sticker",
        "packageId": packageId,
        "stickerId": stickerId
    };
    lineClient.pushMessage(userId, lineStickerMessage);
};
const serchWorkOutProkect = (userId, result) => {
    const requestTime = new Date().getTime();
    const carouselMessage = {
        type: "template",
        altText: "this is a carousel template",
        template: {
            type: "carousel",
            columns: [
                {
                    thumbnailImageUrl: "https://i.imgur.com/AilZ9UY.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "慢跑：為什麼80%的跑步者會受傷？",
                    text: "跑的路程越長，消耗的熱量越大。",
                    actions: [
                        {
                            type: "uri",
                            label: "慢跑運動須知",
                            data: "action=signInCarousel&requestTime=" + requestTime,
                            uri: "https://www.youtube.com/watch?v=EH2qVwAHrC8"
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/rF0LnIt.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "游泳：它是一項全身協調動作的運動，",
                    text: "對增強心肺功能，鍛鍊靈活性和力量都很有好處。",
                    actions: [
                        {
                            type: "postback",
                            label: "游泳",
                            data: "action=reportCarousel&requestTime=" + requestTime,
                            text: "游泳"
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/DEzj2dV.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "拉筋運動：幫助放鬆，增加睡眠品質。",
                    text: "做好全身主要肌肉的拉筋動作，保護身體，也會讓運動的效果更好。",
                    actions: [
                        {
                            type: "uri",
                            label: "拉筋運動",
                            data: "action=beginPracticeCarousel&requestTime=" + requestTime,
                            uri: "https://www.youtube.com/watch?v=pzjoX0mVBhM",
                        }
                    ]
                },
                {
                    thumbnailImageUrl: "https://i.imgur.com/Y2tgdyk.jpg",
                    imageBackgroundColor: "#FFFFFF",
                    title: "跳舞：每天十分鐘一起學律動",
                    text: "舞蹈基礎律動教學，跟著一起律動起來",
                    actions: [
                        {
                            type: "uri",
                            label: "律動教學",
                            data: "action=endPracticeCarousel&requestTime=" + requestTime,
                            uri: "https://www.youtube.com/watch?v=G4LQXmKcF8Y"
                        }
                    ]
                }
            ],
            imageAspectRatio: "rectangle",
            imageSize: "cover"
        }
    };
    return pushMessage(userId, carouselMessage);
};
//# sourceMappingURL=index.js.map