import * as googleSheets from "../services/sheetService"
import { attendRecordColumn } from "../sheetColumn"
import { Member } from "../model"

export const createAttendRecord = async (member: Member, time: string) => {
    const auth = await googleSheets.authorize()
    const values = [
        [
            member.name,
            member.sex,
            time
        ]
    ]
    await googleSheets.appendSheet(auth, attendRecordColumn.sheetId, encodeURI(attendRecordColumn.workspace), values)
}