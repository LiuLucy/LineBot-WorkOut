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
exports.getLineLink = (now) => __awaiter(this, void 0, void 0, function* () {
    const auth = yield googleSheets.authorize();
    const queryString = `select ${sheetColumn_1.outLineColumn.date}, ${sheetColumn_1.outLineColumn.topic}, ${sheetColumn_1.outLineColumn.url} where ${sheetColumn_1.outLineColumn.date} = date '${now}'`;
    console.log(queryString);
    const values = yield googleSheets.querySheet(auth, queryString, sheetColumn_1.outLineColumn.sheetId, sheetColumn_1.outLineColumn.gid);
    const outLine = {
        date: values[0][0],
        topic: values[0][1],
        url: values[0][2]
    };
    console.log(outLine);
    return outLine;
});
//# sourceMappingURL=lineLinkService.js.map