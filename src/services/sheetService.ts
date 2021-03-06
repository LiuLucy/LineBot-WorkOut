import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"

import axios from "axios"

import { sheetClientSecret, sheetToken } from "../chatbotConfig"

export const authorize = (): Promise<OAuth2Client> => {
    return new Promise(resolve => {
        const secret = sheetClientSecret.installed.client_secret
        const clientId = sheetClientSecret.installed.client_id
        const redirectUrl = sheetClientSecret.installed.redirect_uris[0]
        const oauth2Client = new OAuth2Client(clientId, secret, redirectUrl)
        oauth2Client.setCredentials({
            access_token: sheetToken.access_token,
            refresh_token: sheetToken.refresh_token
        })
        resolve(oauth2Client)
    })
}

export const readSheet = (auth: OAuth2Client, spreadsheetId: string, range: string): Promise<Array<any>> => {
    return new Promise((resolve, reject) => {
        const sheets = google.sheets("v4")
        sheets.spreadsheets.values.get({
            auth: auth,
            spreadsheetId: spreadsheetId,
            range: range
        }, (error, result) => {
            if (error) {
                console.log("The API returned an error: ", error)
                reject(error)
            } else
                resolve(result.data.values)
        })
    })
}

export const appendSheet = (auth: OAuth2Client, spreadsheetId: string, range: string, values: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const sheets = google.sheets("v4");
        sheets.spreadsheets.values.append({
            auth: auth,
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: { values: values }
        }, (error, result) => {
            if (error) {
                console.log(error)
                reject(error)
            } else {
                console.log("%d cells appended.", result.data.updates.updatedCells)
                resolve(result)
            }
        })
    })
}

export const writeSheet = (auth: OAuth2Client, spreadsheetId: string, range: string, values: any): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        const sheets = google.sheets("v4")
        const body = { values: values }
        sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: body,
            auth: auth
        }, (error, result) => {
            if (error) {
                console.log("The API returned an error: ", error)
                reject(error)
            } else {
                console.log("%d cells updated. ", result.data.updatedCells)
                resolve(result)
            }
        });
    });
}

export const clearSheet = (auth: OAuth2Client, spreadsheetId: string, range: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const sheets = google.sheets("v4")
        sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: range,
            auth: auth
        }, (error, result) => {
            if (error) {
                console.log("The API returned an error: ", error)
                reject(error)
            } else {
                console.log("%d cells clear. ", 1)
                resolve(result)
            }
        })
    })
}

export const querySheet = (auth: OAuth2Client, queryString: string, sheetId: string, gid: string): Promise<Array<any>> => {
    return new Promise(async (resolve, reject) => {
        const reg = /google.visualization.Query.setResponse\((.*)\)/g
        const query = encodeURI(queryString)
        const url = `https://spreadsheets.google.com/tq?tqx=out:json&tq=${query}&key=${sheetId}&gid=${gid}`
        const token = await auth.refreshAccessToken()
        const headers = {
            "Authorization": "Bearer " + token.credentials.access_token
        }
        console.log("URL : " + url)
        axios.get(url, { headers }).then(result => {
            const data = JSON.parse(reg.exec(result.data)[1]).table.rows
            console.log("data:"+data)
            const formats = []
            data.forEach(col => {
                const format = []
                col.c.forEach(row => {
                    if (row) {
                        if (typeof row.v === "string") {
                            if (row.v.includes("Date")) {
                                format.push(row.f)
                                return
                            }
                        }
                        if (typeof row.v === "number") {
                            if (row.f.includes("%")) {
                                format.push(row.f)
                                return
                            }
                        }
                        if (Array.isArray(row.v)) {
                            format.push(row.f)
                            return
                        }
                        format.push(row.v)
                        return
                    }
                    format.push(null)
                })
                formats.push(format)
            })
            resolve(formats)
        }).catch(error => reject(error))
    })
}