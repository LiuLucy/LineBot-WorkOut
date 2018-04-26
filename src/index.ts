import * as functions from "firebase-functions"
import { Client, validateSignature, WebhookEvent, Message, TextMessage, TemplateMessage,StickerMessage } from "@line/bot-sdk"
import * as Dialogflow from "apiai"
import * as MomentZone from "moment-timezone"
import * as memberService from "./services/memberService"
import * as groupService from "./services/groupService"
import * as attendClassService from "./services/attendClassService"
import * as submitReportService from "./services/submitReportService"
import * as praticeService from "./services/praticeService"
import * as environmentService from "./services/environmentService"
import * as chatbaseService from "./services/chatbaseService"
import * as lineLinkService from "./services/lineLinkService"

import { practiceRecordColumn } from "./sheetColumn"
import { LINE, DIALOGFLOW, CHATBASE } from "./chatbotConfig"
import { Member, Performance } from "./model"
import { user } from "firebase-functions/lib/providers/auth";


const lineClient = new Client({
    channelSecret: LINE.channelSecret,
    channelAccessToken: LINE.channelAccessToken
})
const dialogflowAgent = Dialogflow(DIALOGFLOW.agentToken)


export const timeConstrain = true

export const webhook = functions.https.onRequest((req, res) => {
    const signature = req.headers["x-line-signature"] as string
    if (validateSignature(JSON.stringify(req.body), LINE.channelSecret, signature)) {
        const events = req.body.events as Array<WebhookEvent>
        events.forEach(event => eventDispatcher(event))
    }
    res.sendStatus(200)
})

const eventDispatcher = (event: WebhookEvent): void => {
    const userId = event.source.userId
    switch (event.type) {
        case "follow":
            replyFollowMessage(event.replyToken, userId)
            break
        case "unfollow":
            unfollow(userId)
            break
        case "join":
            if (event.source.type == "group")
                replyJoinMessage(event.replyToken, event.source.groupId)
            break
        case "leave":
            if (event.source.type == "group")
                leave(event.source.groupId)
            break
        case "message":
            if (event.message.type === "text") {
                const message = event.message.text
                if (event.source.type == "group")
                    chatbaseService.sendMessageToChatBase(userId, message, "discuss", "Line", "user", "Group")
                else
                    messageDispatcher(userId, event.message.text)
            }
            break
        default:
            break
    }
}

const replyFollowMessage = async (replyToken: string, userId: string): Promise<any> => {
    const lineMessage: TextMessage = {
        type: "text",
        text: "歡迎加入WorkOut\n過程中你可以透過我來紀錄運動的瑣碎事情，和朋友一起互相監督吧！\n當然了！我也會提醒你喔。"
    }
    await replyMessage(replyToken, lineMessage)
    setDialogflowEvent(userId, "askForName")
}

const unfollow = async (userId: string) => {
    const member = await memberService.getMember(userId)
    memberService.deleteMember(member)
}

const replyJoinMessage = (replyToken: string, groupId: string): Promise<any> => {
    const url = `https://docs.google.com/forms/d/e/1FAIpQLSd6_4pL6hy9lb5UPSe2lEItQINdVwW4MLOLkuDYygrhC8nWBg/viewform?usp=pp_url&entry.929266669=${groupId}`
    const lineMessage: TextMessage = {
        type: "text",
        text: `運動一群人們\n很高興受邀加入到你的群組【${groupId}】\n\n為了更瞭解你，幫我填填表單吧`
    }
    const buttonsMessage: TemplateMessage = {
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
    }
    return replyMessage(replyToken, [lineMessage, buttonsMessage])
}

const leave = async (groupId: string) => {
    const group = await groupService.getGroup(groupId)
    groupService.deleteGroup(group)
}

const messageDispatcher = (userId: string, message: string): void => {
    const request = dialogflowAgent.textRequest(message, { sessionId: userId })
    request.on("response", response => {
        actionDispatcher(userId, response.result)
        chatbaseService.sendMessageToChatBase(userId, response.result.resolvedQuery, response.result.metadata.intentName, "Line", "user")
    }).end()
    request.on("error", error => console.log("Error: ", error))
}

const setDialogflowEvent = async (userId: string, eventName: string, eventParameter?: Object) => {
    const request = dialogflowAgent.eventRequest({
        name: eventName,
        data: eventParameter
    }, { sessionId: userId })
    request.on("response", response => {
        actionDispatcher(userId, response.result)
    }).end()
    request.on("error", error => console.log("Error: ", error))
}

const actionDispatcher = (userId: string, result: any): void => {
    console.log(JSON.stringify(result, null, 4))
    const action = result.action
    console.log("action : "+action)
    switch (action) {
        case "register.askForRegister":
            askForRegister(userId, result)
            break
        case "attendClass":
            attendClass(userId, result)
            break
        case "beginPractice":
            replyCarouselMessage(userId, result)
            break
        case "endPractice":
            endPractice(userId, result)
            break
        case "requestReport":
            requestReport(userId, result)
            break
        case "submittedReport":
            submittedReport(userId, result)
            break
        case "notSubmittedReport":
            notSubmittedReport(userId, result)
            break
        case "BeginPracticeSelectProject":
            beginPractice(userId,result)
            break
        case "serchWorkOutProkect":
            serchWorkOutProkect(userId,result)
        default:
            pushErrorMessage(userId, result)
            break
    }
    resetPracticeState(userId)
}

const askForRegister = async (userId: string, result: any) => {
    const name = result.parameters.name
    const member = await memberService.getMemberByName(name)
    console.log(member)
    let url = "https://docs.google.com/forms/d/e/1FAIpQLSdiuNZ31cRlmH8o8_YQSqrQUhDE_uRq_l20Swad2zC6rx5ExQ/viewform?usp=pp_url"
    if (member)
        url += `&entry.1736022417=${member.name}&entry.25587017=${member.hight}&entry.1022594535=${member.weight}&entry.336451093=${member.sex}&entry.1776352645=${userId}`
    else
        url += `&entry.1736022417=${name}&entry.1776352645=${userId}`
    sendsticker(userId,"2","150");
    const lineMessage: TemplateMessage = {
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
    }
    return pushMessage(userId, lineMessage);
}

const attendClass = async (userId: string, result: any): Promise<any> => {

}

const beginPractice = async (userId: string, result: any): Promise<any> => {
    const workOutProject = result.parameters.workOutProject
    const responseText = result.fulfillment.messages[0].speech as string
    const parameters = result.parameters
    if (parameters.practice !== "" && parameters.begin !== "") {
        const member = await memberService.getMember(userId)
        if (await canBeginPractice(member) === "canBeginPractice") {
            memberService.updateMemberWorkState(member, "1")
            const now = MomentZone().tz("Asia/Taipei")
            await praticeService.createPracticeRecord(member, now.format("Y/M/D HH:mm"),workOutProject)
            sendsticker(userId,"2","505");
            const lineMessage: TextMessage = {
                type: "text",
                text: responseText.replace("{{beginTime}}", now.format("Y/M/D HH:mm"))
            }
            pushMessage(userId, lineMessage)
            chatbaseService.sendMessageToChatBase(userId, result.resolvedQuery, result.metadata.intentName, "Line", "user", "Practice")
        }
        else if (await canBeginPractice(member) === "practicing") {
            let practiceRecord = await memberService.getMemberPracticeRecord(member.name)
            sendsticker(userId,"2","505");
            const lineMessage: TextMessage[] = [
                {
                    type: "text",
                    text: "開始運動了！！加油加油"
                },
                {
                    type: "text",
                    text: responseText.replace("{{beginTime}}", practiceRecord.beginTime)
                }
            ]
            pushMessage(userId, lineMessage)
        }
    } else
        pushErrorMessage(userId, result)
}

const endPractice = async (userId: string, result: any): Promise<any> => {
    const parameters = result.parameters
    if (parameters.practice !== "" && parameters.end !== "") {
        const member = await memberService.getMember(userId)
        if (canEndPractice(member)) {
            const responseText = result.fulfillment.messages[0].speech as string
            updatePraticeRecord(member, responseText)
        }
        else {
            const lineMessage: TextMessage = {
                type: "text",
                text: "運動還沒開始！請點擊開始運動"
            }
            pushMessage(userId, lineMessage)
        }
    } else
        pushErrorMessage(userId, result)
}

const updatePraticeRecord = async (member: Member, responseText: string) => {
    memberService.updateMemberWorkState(member, "0")
    const now = MomentZone().tz("Asia/Taipei")
    
    let practiceRecord = await memberService.getMemberPracticeRecord(member.name)

    console.log("Have in")
    const range = `${practiceRecordColumn.workspace}!${practiceRecordColumn.endTime}${practiceRecord.id}:${practiceRecordColumn.Calories}${practiceRecord.id}`
    const values = [
        [
            now.format("Y/M/D HH:mm"),
            `=IF(INDIRECT("G"&ROW())<>"",TEXT(INDIRECT("G"&ROW())-INDIRECT("F"&ROW()),"h:mm"), "")`,
            `=ROUND(IF(\'實習紀錄\'!E:E="游泳", \'運動\'!B3 * \'實習紀錄\'!D:D *\'實習紀錄\'!H:H,IF(\'實習紀錄\'!E:E="拉筋運動", \'運動\'!B2 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H, IF(\'實習紀錄\'!E:E="慢跑", \'運動\'!B4 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H,IF(\'實習紀錄\'!E:E="跳舞", \'運動\'!B5 * \'實習紀錄\'!D:D*\'實習紀錄\'!H:H,"")))),0)`
        ]
    ]
    await praticeService.updatePracticeRecord(range, values)

    practiceRecord = await memberService.getMemberPracticeRecord(member.name)
    //const performance = await memberService.getMemberPerformance(member.name)
    console.log("practiceRecord: -----------------------"+ practiceRecord)
    const lineMessage: TextMessage = {
        type: "text",
        text:responseText.replace("{{beginTime}}", practiceRecord.beginTime)
            .replace("{{endTime}}", practiceRecord.endTime)
            .replace("{{practiceTime}}", practiceRecord.practiceTime)
            .replace("{{workOutProject}}",practiceRecord.workOutProject)
            .replace("{{calories}}", practiceRecord.Calories)
    }
    pushMessage(member.lineId, lineMessage)
}

const requestReport = (userId: string, result: any): void => {
    const responseText = result.fulfillment.messages[0].speech as string
    const parameters = result.parameters
    if (parameters.report !== "" && parameters.submit !== "") {
        const lineMessage: TextMessage = {
            type: "text",
            text: responseText
        }
        const confirmMessage: TemplateMessage = {
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
        }
        pushMessage(userId, [lineMessage, confirmMessage])
    } else
        pushErrorMessage(userId, result)
}

const submittedReport = async (userId: string, result: any) => {
    const parameters = result.parameters
    if (parameters.report !== "" && parameters.submit !== "") {
        const member = await memberService.getMember(userId)
        const now = MomentZone().tz("Asia/Taipei")
        const responseText = result.fulfillment.messages[0].speech as string
        await submitReportService.createSubmitRecord(member, now.format("Y/M/D HH:mm"))

        const performance = await memberService.getMemberPerformance(member.name)
        const lineMessage: TextMessage = {
            type: "text",
            text: responseText.replace("{{submitTime}}", now.format("Y/M/D HH:mm"))
        }
        pushMessage(userId, lineMessage)
    } else
        pushErrorMessage(userId, result)
}

const notSubmittedReport = (userId: string, result: any) => {
    const lineMessage: TextMessage = {
        type: "text",
        text: result.fulfillment.messages[0].speech as string
    }
    pushMessage(userId, lineMessage)
}

const canAttend = async (member: Member): Promise<"canAttend" | "notAtTheTime"> => {
    if (timeConstrain) {
        // let isClassTime = await environmentService.getClassTime()
        // if (isClassTime) {
        //     if (member.attendState == "1")
        //         return "attended"
        //     return "canAttend"
        // }
        return "notAtTheTime"
    }
    return "canAttend"
}

const canBeginPractice = async (member: Member): Promise<"canBeginPractice" | "practicing"> => {
    // if (timeConstrain) {
    //     let isClassTime = await environmentService.getClassTime()
    //     if (isClassTime)
    //         return "notAtTheTime"
    // }
    if (member.workState != "0")
        return "practicing"
    else
        return "canBeginPractice"
}

const canEndPractice = (member: Member): Boolean => {
    return member.workState != "0"
}

const resetPracticeState = async (userId: string) => {
    const member = await memberService.getMember(userId)
    if (member.workState != "0")
        memberService.updateMemberWorkState(member, "1")
}

export const sendPraticeAlert = functions.https.onRequest((req, res) => {
    const member = req.body.member
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
    res.sendStatus(200)
})

export const pushTextMessage = functions.https.onRequest((req, res) => {
    const message = req.body.message
    const lineId = req.body.lineId
    const textMessage: TextMessage = {
        type: "text",
        text: message
    }
    pushMessage(lineId, textMessage)
    res.sendStatus(200)
})

export const sendPerformanceReport = functions.https.onRequest(async (req, res) => {
    const memberPerformance = req.body as [{ member: Member, performance: Performance }]
    await Promise.all([sendReportToGroup(memberPerformance), sendReportToMembers(memberPerformance)])
    res.sendStatus(200)
})

const sendReportToGroup = async (data: [{ member: Member, performance: Performance }]): Promise<any> => {
    const groups = (await groupService.getGroups()).map(group => group.groupLineId)
    console.log(groups)
    const sorted = data.sort((a, b) => {
        if (parseInt(`${a.performance.boyWorkOutRank}`) < parseInt(`${b.performance.girlWorkOutRank}`))
            return -1
        if (parseInt(`${a.performance.boyWorkOutRank}`) > parseInt(`${b.performance.boyWorkOutRank}`))
            return 1
        return 0
    })
    const now = MomentZone().tz("Asia/Taipei")
    const lineMessage: TextMessage[] = [{
        type: "text",
        text: `運動中心\n${now.format("M月D日")} 今日運動成果：`
    }]
    let message = ""
    for (let index = 0; index < sorted.length; index++) {
        const memberPerformance = sorted[index]
        message += `<${memberPerformance.performance.name}>\n` +
            `運動次數：${memberPerformance.performance.practiceCount}\n` +
            `運動的時間：${memberPerformance.performance.totalPracticeTime}\n`
        if (index % 10 === 9) {
            lineMessage.push({
                type: "text",
                text: message
            })
            message = ""
        } else if (index !== sorted.length - 1)
            message += "\n\n"
    }
    if (message !== "") {
        lineMessage.push({
            type: "text",
            text: message
        })
    }
    console.log(lineMessage)
    groups.forEach(groupId => pushMessage(groupId, lineMessage))
}

const sendReportToMembers = (data: [{ member: Member, performance: Performance }]): Promise<any> => {
    const promises = new Array<Promise<any>>()
    for (const memberPerformance of data) {
        const lineMessage = {
            type: "text",
            text: `${MomentZone().tz("Asia/Taipei").format("M月D日")} ${memberPerformance.performance.name}\n\n` +
                `運動次數：${memberPerformance.performance.practiceCount}\n` +
                `你運動總時數：${memberPerformance.performance.totalPracticeTime}\n` +
                `男生總時數：${memberPerformance.performance.boyWorkOutTime}\n` +
                `女生總時數${memberPerformance.performance.girlWorkOutTime}\n`
     } as TextMessage
        promises.push(pushMessage(memberPerformance.member.lineId, lineMessage))
    }
    return Promise.all(promises)
}

export const sendWorkOutTime = (member:Member):Promise<any>=>{
    const lineMessage: TextMessage = {
        type: "text",
        text: `今天要記得去運動喔！`
    }
    return pushMessage(member.lineId,lineMessage)
}

export const sendHealthReport = functions.https.onRequest(async (req, res) => {
    const groups = (await groupService.getGroups()).map(group => group.groupLineId)
    const lineMessage: TextMessage = {
        type: "text",
        text: `今天要記得去運動喔！`
    }
    groups.forEach(groupId => pushMessage(groupId, lineMessage))
    res.sendStatus(200)
})

const pushCommandMessage = (userId: string): Promise<any> => {
    const lineMessage: TextMessage = {
        type: "text",
        text: `為了讓你方便，指令有： \n1.開始運動\n2. 結束運動\n3. 上傳照片`
    }
    return pushMessage(userId, lineMessage)
}

const pushErrorMessage = async (userId: string, result: any): Promise<any> => {
    const lineMessage: TextMessage = {
        type: "text",
        text: (result.fulfillment.messages[0].speech as string).replace("{{message}}", result.resolvedQuery)
    }
    pushMessage(userId, lineMessage)
}

const replyMessage = (replyToken: string, lineMessage: Message | Array<Message>): Promise<any> => {
    return lineClient.replyMessage(replyToken, lineMessage)
}

const pushMessage = (userId: string, lineMessage: Message | Array<Message>): Promise<any> => {
    if (Array.isArray(lineMessage)) {
        for (const message of lineMessage) {
            if (message.type === "text")
                chatbaseService.sendMessageToChatBase(userId, message.text, "reply", "Line", "agent")
            else
                chatbaseService.sendMessageToChatBase(userId, `This is a ${message.type} template message`, "reply", "Line", "agent")
        }
    } else {
        if (lineMessage.type === "text")
            chatbaseService.sendMessageToChatBase(userId, lineMessage.text, "reply", "Line", "agent")
        else
            chatbaseService.sendMessageToChatBase(userId, `This is a ${lineMessage.type} template message`, "reply", "Line", "agent")
    }
    return lineClient.pushMessage(userId, lineMessage)
}

const replyCarouselMessage = async(userId: string,result: any): Promise<any> => {
    const requestTime = new Date().getTime();
    const lineMessage: TextMessage = {
        type: "text",
        text: `選擇你的運動項目`
    }
    lineClient.pushMessage(userId, lineMessage)
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
    } as TemplateMessage;
    return pushMessage(userId, carouselMessage);
}

const sendsticker = (userId: string, packageId: string, stickerId: string) => {
    const lineStickerMessage: StickerMessage = {
        "type": "sticker",
        "packageId": packageId,
        "stickerId": stickerId
    }
    lineClient.pushMessage(userId, lineStickerMessage)
}

const serchWorkOutProkect = (userId:string,result:any) => {
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
    } as TemplateMessage;
    return pushMessage(userId, carouselMessage);
}