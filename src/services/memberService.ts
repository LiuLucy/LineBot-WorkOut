import * as googleSheets from "../services/sheetService"
import { memberColumn } from "../sheetColumn"
import { Member, AttendRecord, PracticeRecord, Performance } from "../model";
import { attendRecordColumn, performanceColumn, reportRecordColumn, practiceRecordColumn } from "../sheetColumn"

export const getMember = async (userId: string) => {
    const auth = await googleSheets.authorize()
    const queryString = `select ${memberColumn.id}, ${memberColumn.name}, ${memberColumn.hight}, ${memberColumn.weight}, ${memberColumn.sex}, ${memberColumn.lineId}, ${memberColumn.workState}, ${memberColumn.attendState} where ${memberColumn.lineId} = '${userId}'`
    console.log("queryString: "+queryString)
    const values = await googleSheets.querySheet(auth, queryString, memberColumn.sheetId, memberColumn.gid)
    console.log("value: "+values)
    const member = {
        id: values[0][0],
        name: values[0][1],
        hight: values[0][2],
        weight: values[0][3],
        sex: values[0][4],
        lineId: values[0][5],
        workState: values[0][6],
        attendState: values[0][7]
    } as Member
    return member
}

export const getMemberByName = async (name: string) => {
    const auth = await googleSheets.authorize()
    const queryString = `select ${memberColumn.id}, ${memberColumn.name}, ${memberColumn.hight}, ${memberColumn.weight}, ${memberColumn.sex}, ${memberColumn.lineId}, ${memberColumn.workState}, ${memberColumn.attendState} where ${memberColumn.name} = '${name}'`
    const values = await googleSheets.querySheet(auth, queryString, memberColumn.sheetId, memberColumn.gid)
    console.log(values)
    if (values.length) {
        const member = {
            id: values[0][0],
            name: values[0][1],
            hight: values[0][2],
            weight: values[0][3],
            sex: values[0][4],
            lineId: values[0][5],
            workState: values[0][6],
            attendState: values[0][7]
        } as Member
        console.log(member)
        return member
    }
    return null
}

export const getMemberPerformance = async (name: string) => {
    const auth = await googleSheets.authorize()
    const queryString = `select ${performanceColumn.id},` +
        `${performanceColumn.name},` +
        `${performanceColumn.practiceCount},` +
        `${performanceColumn.totalPracticeTime},` +
        `${performanceColumn.boyWorkOutTime},` +
        `${performanceColumn.girlWorkOutTime},` +
        `${performanceColumn.boyWorkOutRank} ` +
        `${performanceColumn.girlWorkOutRank} ` +
        `where ${performanceColumn.name} = '${name}'`  
        console.log("--------------d-----d-ddd--------"+queryString)
    const values = await googleSheets.querySheet(auth, queryString, performanceColumn.sheetId, performanceColumn.gid)
    const performance = {
        id: values[0][0],
        name: values[0][1],
        practiceCount: values[0][2],
        totalPracticeTime: values[0][3],
        boyWorkOutTime: values[0][4],
        girlWorkOutTime: values[0][5],
        boyWorkOutRank: values[0][6],
        girlWorkOutRank: values[0][7]
    } as Performance
   
    return performance
}

export const getMemberPracticeRecord = async (name: string) => {
    const auth = await googleSheets.authorize()
    const queryString = `select ${practiceRecordColumn.id}, ${practiceRecordColumn.name}, ${practiceRecordColumn.sex}, ${practiceRecordColumn.weight}, ${practiceRecordColumn.workOutProject}, ${practiceRecordColumn.beginTime}, ${practiceRecordColumn.endTime}, ${practiceRecordColumn.practiceTime}, ${practiceRecordColumn.Calories} where ${practiceRecordColumn.name} = '${name}' order by ${practiceRecordColumn.id} DESC limit 1`
    
    const values = await googleSheets.querySheet(auth, queryString, practiceRecordColumn.sheetId, practiceRecordColumn.gid)
    
    console.log("value:" + values)
    const practiceRecord = {
        id: values[0][0],
        name: values[0][1],
        sex: values[0][2],
        weight:values[0][3],
        workOutProject:values[0][4],
        beginTime: values[0][5],
        endTime: values[0][6],
        practiceTime: values[0][7],
        Calories:values[0][8]
    } as PracticeRecord
    return practiceRecord
}

export const getMemberAttendRecord = async (name: string) => {
    const auth = await googleSheets.authorize()
    const queryString = `select ${attendRecordColumn.name},` +
        `${attendRecordColumn.studentId},` +
        `${attendRecordColumn.department},` +
        `${attendRecordColumn.attendTime} ` +
        `where ${attendRecordColumn.name} = '${name}' order by ${attendRecordColumn.attendTime} DESC limit 1`
    console.log(queryString)
    const values = await googleSheets.querySheet(auth, queryString, attendRecordColumn.sheetId, attendRecordColumn.gid)
    const attendRecord = {
        name: values[0][0],
        studentId: values[0][1],
        department: values[0][2],
        attendTime: values[0][3]
    } as AttendRecord
    return attendRecord
}

export const updateMemberWorkState = async (member: Member, workState: string) => {
    const auth = await googleSheets.authorize()
    const range = encodeURI(`${memberColumn.workspace}!${memberColumn.workState}${member.id}:${memberColumn.workState}${member.id}`)
    googleSheets.writeSheet(auth, memberColumn.sheetId, range, [[workState]]);
}

export const updateMemberAttendState = async (member: Member, attendState: string) => {
    const auth = await googleSheets.authorize()
    const range = encodeURI(`${memberColumn.workspace}!${memberColumn.attendState}${member.id}:${memberColumn.attendState}${member.id}`)
    googleSheets.writeSheet(auth, memberColumn.sheetId, range, [[attendState]]);
}

export const deleteMember = async (member: Member) => {
    console.log(member)
    const auth = await googleSheets.authorize()
    let range = encodeURI(`${memberColumn.workspace}!${memberColumn.lineId}${member.id}:${memberColumn.lineId}${member.id}`)
    googleSheets.clearSheet(auth, memberColumn.sheetId, range)
}
