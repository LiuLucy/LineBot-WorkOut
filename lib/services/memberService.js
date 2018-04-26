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
const googleSheets = require("../services/sheetService");
const sheetColumn_1 = require("../sheetColumn");
const sheetColumn_2 = require("../sheetColumn");
exports.getMember = (userId) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_1.memberColumn.id}, ${sheetColumn_1.memberColumn.name}, ${sheetColumn_1.memberColumn.hight}, ${sheetColumn_1.memberColumn.weight}, ${sheetColumn_1.memberColumn.sex}, ${sheetColumn_1.memberColumn.lineId}, ${sheetColumn_1.memberColumn.workState}, ${sheetColumn_1.memberColumn.attendState} where ${sheetColumn_1.memberColumn.lineId} = '${userId}'`;
    console.log("queryString: " + queryString);
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_1.memberColumn.sheetId, sheetColumn_1.memberColumn.gid);
    console.log("value: " + values);
    const member = {
        id: values[0][0],
        name: values[0][1],
        hight: values[0][2],
        weight: values[0][3],
        sex: values[0][4],
        lineId: values[0][5],
        workState: values[0][6],
        attendState: values[0][7]
    };
    return member;
});
exports.getMemberByName = (name) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_1.memberColumn.id}, ${sheetColumn_1.memberColumn.name}, ${sheetColumn_1.memberColumn.hight}, ${sheetColumn_1.memberColumn.weight}, ${sheetColumn_1.memberColumn.sex}, ${sheetColumn_1.memberColumn.lineId}, ${sheetColumn_1.memberColumn.workState}, ${sheetColumn_1.memberColumn.attendState} where ${sheetColumn_1.memberColumn.name} = '${name}'`;
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_1.memberColumn.sheetId, sheetColumn_1.memberColumn.gid);
    console.log(values);
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
        };
        console.log(member);
        return member;
    }
    return null;
});
exports.getMemberPerformance = (name) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_2.performanceColumn.id},` +
        `${sheetColumn_2.performanceColumn.name},` +
        `${sheetColumn_2.performanceColumn.practiceCount},` +
        `${sheetColumn_2.performanceColumn.totalPracticeTime},` +
        `${sheetColumn_2.performanceColumn.boyWorkOutTime},` +
        `${sheetColumn_2.performanceColumn.girlWorkOutTime},` +
        `${sheetColumn_2.performanceColumn.boyWorkOutRank} ` +
        `${sheetColumn_2.performanceColumn.girlWorkOutRank} ` +
        `where ${sheetColumn_2.performanceColumn.name} = '${name}'`;
    console.log("--------------d-----d-ddd--------" + queryString);
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_2.performanceColumn.sheetId, sheetColumn_2.performanceColumn.gid);
    const performance = {
        id: values[0][0],
        name: values[0][1],
        practiceCount: values[0][2],
        totalPracticeTime: values[0][3],
        boyWorkOutTime: values[0][4],
        girlWorkOutTime: values[0][5],
        boyWorkOutRank: values[0][6],
        girlWorkOutRank: values[0][7]
    };
    return performance;
});
exports.getMemberPracticeRecord = (name) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_2.practiceRecordColumn.id}, ${sheetColumn_2.practiceRecordColumn.name}, ${sheetColumn_2.practiceRecordColumn.sex}, ${sheetColumn_2.practiceRecordColumn.weight}, ${sheetColumn_2.practiceRecordColumn.workOutProject}, ${sheetColumn_2.practiceRecordColumn.beginTime}, ${sheetColumn_2.practiceRecordColumn.endTime}, ${sheetColumn_2.practiceRecordColumn.practiceTime}, ${sheetColumn_2.practiceRecordColumn.Calories} where ${sheetColumn_2.practiceRecordColumn.name} = '${name}' order by ${sheetColumn_2.practiceRecordColumn.id} DESC limit 1`;
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_2.practiceRecordColumn.sheetId, sheetColumn_2.practiceRecordColumn.gid);
    console.log("value:" + values);
    const practiceRecord = {
        id: values[0][0],
        name: values[0][1],
        sex: values[0][2],
        weight: values[0][3],
        workOutProject: values[0][4],
        beginTime: values[0][5],
        endTime: values[0][6],
        practiceTime: values[0][7],
        Calories: values[0][8]
    };
    return practiceRecord;
});
exports.getMemberAttendRecord = (name) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_2.attendRecordColumn.name},` +
        `${sheetColumn_2.attendRecordColumn.studentId},` +
        `${sheetColumn_2.attendRecordColumn.department},` +
        `${sheetColumn_2.attendRecordColumn.attendTime} ` +
        `where ${sheetColumn_2.attendRecordColumn.name} = '${name}' order by ${sheetColumn_2.attendRecordColumn.attendTime} DESC limit 1`;
    console.log(queryString);
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_2.attendRecordColumn.sheetId, sheetColumn_2.attendRecordColumn.gid);
    const attendRecord = {
        name: values[0][0],
        studentId: values[0][1],
        department: values[0][2],
        attendTime: values[0][3]
    };
    return attendRecord;
});
exports.updateMemberWorkState = (member, workState) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const range = encodeURI(`${sheetColumn_1.memberColumn.workspace}!${sheetColumn_1.memberColumn.workState}${member.id}:${sheetColumn_1.memberColumn.workState}${member.id}`);
    googleSheets.writeSheet(auth, sheetColumn_1.memberColumn.sheetId, range, [[workState]]);
});
exports.updateMemberAttendState = (member, attendState) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const range = encodeURI(`${sheetColumn_1.memberColumn.workspace}!${sheetColumn_1.memberColumn.attendState}${member.id}:${sheetColumn_1.memberColumn.attendState}${member.id}`);
    googleSheets.writeSheet(auth, sheetColumn_1.memberColumn.sheetId, range, [[attendState]]);
});
exports.deleteMember = (member) => __awaiter(this, void 0, void 0, function* () {
    console.log(member);
    const auth = yield googleSheets.authorize();
    let range = encodeURI(`${sheetColumn_1.memberColumn.workspace}!${sheetColumn_1.memberColumn.lineId}${member.id}:${sheetColumn_1.memberColumn.lineId}${member.id}`);
    googleSheets.clearSheet(auth, sheetColumn_1.memberColumn.sheetId, range);
});
//# sourceMappingURL=memberService.js.map