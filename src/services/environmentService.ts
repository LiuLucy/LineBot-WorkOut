import * as googleSheets from "../services/sheetService"
import { environmentColumn } from "../sheetColumn"

export const getClassTime = async () => {
    const auth = await googleSheets.authorize()
    let isClassTime =(await googleSheets.readSheet(auth, environmentColumn.sheetId, encodeURI(`${environmentColumn.workspace}!${environmentColumn.isClassTime}2:${environmentColumn.isClassTime}2`)))[0][0]
    return isClassTime == "FALSE"
}