export type Member = {
    id: number
    name: string
    hight: string
    weight: string
    sex: string
    lineId: string
    workState: string
    attendState: string
}

export type Group = {
    id: number
    groupName: string
    groupLineId: string
    adminName: string
}

export type Performance = {
    id: string
    name: string
    practiceCount: string
    totalPracticeTime: string
    boyWorkOutTime: string
    girlWorkOutTime: string
    boyWorkOutRank: string
    girlWorkOutRank: string
}

export type AttendRecord = {
    name: string
    studentId: string
    department: string
    attendTime: string
}

export type PracticeRecord = {
    id: string
    name: string
    sex: string
    weight:string
    workOutProject:string
    beginTime: string
    endTime: string
    practiceTime: string 
    Calories:string
}

export type OutLine = {
    date: string,
    topic: string,
    url: string
}


