import * as googleSheets from "../services/sheetService"
import { practiceRecordColumn } from "../sheetColumn"
import { Member } from "../model"

export const createPracticeRecord = async (member: Member, time: string,workOutName:string) => {
    const auth = await googleSheets.authorize()
    const values = [
        [
            "=ROW()",
            member.name,
            member.sex,
            member.weight,
            workOutName,
            time
        ]
    ]
    await googleSheets.appendSheet(auth, practiceRecordColumn.sheetId, encodeURI(practiceRecordColumn.workspace), values)
}

export const updatePracticeRecord = async (range: string, values: any) => {
    const auth = await googleSheets.authorize()
    await googleSheets.writeSheet(auth, practiceRecordColumn.sheetId, encodeURI(range), values)
}