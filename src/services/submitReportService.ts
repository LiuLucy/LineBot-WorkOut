import * as googleSheets from "../services/sheetService"
import { reportRecordColumn } from "../sheetColumn"
import { Member } from "../model"

export const createSubmitRecord = async (member: Member, time: string) => {
    const auth = await googleSheets.authorize()
    const values = [
        [
            member.name,
            member.sex,
            time
        ]
    ]
    await googleSheets.appendSheet(auth, reportRecordColumn.sheetId, encodeURI(reportRecordColumn.workspace), values)
}