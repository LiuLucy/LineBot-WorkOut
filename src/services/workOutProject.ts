import * as googleSheets from "../services/sheetService"
import { practiceRecordColumn } from "../sheetColumn"
import { Member } from "../model"

export const createWorkOutRecord = async (member: Member, time: string) => {
    const auth = await googleSheets.authorize()
    const values = [
        [
            member.name,
            member.sex,
            time
        ]
    ]
    await googleSheets.appendSheet(auth, practiceRecordColumn.sheetId, encodeURI(practiceRecordColumn.workspace), values)
}