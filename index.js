const puppeteer = require('puppeteer')
const fs = require('fs')
const fsPromises = fs.promises
const config = require("./config.json")

// сохранение куки
const saveCookie = async (page) => {
    const cookies = await page.cookies()
    const cookieJson = JSON.stringify(cookies, null, 2)
    await fsPromises.writeFile(__dirname + '/cookies.json', cookieJson)
}

// загрузка куки
const loadCookie = async (page) => {
    const cookieJson = await fsPromises.readFile(__dirname + '/cookies.json')
    const cookies = JSON.parse(cookieJson)
    await page.setCookie(...cookies)
}

const getData = async () => {
    const jsonStr = await fsPromises.readFile(__dirname + '/data.json')
    return JSON.parse(jsonStr)
}

const saveData = async (data) => {
    await fsPromises.writeFile(__dirname + '/data.json', JSON.stringify(data, null, 2))
}

const checkFileExist = (fileName) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(__dirname + `/${fileName}`)) resolve(true)
        resolve(false)
    })
}

const fileExist = async (fileName, defaultStr = "") => {
    try {
        const logExist = await checkFileExist(fileName)
        if (!logExist) {    // если файл лога не создан - создать
            await fsPromises.writeFile(__dirname + `/${fileName}`, defaultStr)
        }
    } catch (error) {
        console.log("Ошибка", error);
    }
}

const dateTimeToString = (date) => {
    return date.getDate() + "." + date.getMonth() + "." + date.getFullYear() + " " +
        date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
}

(async () => {
    try {
        await fileExist("log.txt", "")
        await fileExist("data.json", "{}")

        let logFile = await fsPromises.readFile(__dirname + '/log.txt')
        await fsPromises.writeFile(__dirname + '/cookies.json', "[]");   // очистка куки

        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')
        await loadCookie(page); // загрузить куки
        await page.goto(config.WATCHING_URL,
            { waitUntil: 'domcontentloaded' })
        await saveCookie(page); // сохранить в куки

        await page.waitForSelector('script[type="application/ld+json"]')
        const result = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]').innerHTML)

        const json = JSON.parse(result)
        const date = new Date()
        const info = {
            name: json["name"],
            description: json["description"],
            url: json["offers"]["url"],
            price: json["offers"]["price"],
            currency: json["offers"]["priceCurrency"],
            image: json["image"],
            date: dateTimeToString(date)
        }

        const prevData = await getData()

        if (prevData.price > info.price) {
            const sendMessagePage = await browser.newPage()
            await sendMessagePage.goto(`https://maker.ifttt.com/trigger/${config.IFTTT_EVENT}/with/key/${config.IFTTT_KEY}?value1=${info.name}&value2=${prevData.price}&value3=${info.price}`)
        }
        await saveData(info)

        await browser.close()
        await fsPromises.writeFile(__dirname + '/cookies.json', "[]")   // очистка куки

        logFile = `[${dateTimeToString(date)}] Update successful\n` + logFile
        await fsPromises.writeFile(__dirname + '/log.txt', logFile)   // успешно в лог
    } catch (error) {
        console.log(error)

        let logFile = await fsPromises.readFile(__dirname + '/log.txt')
        const date = new Date()
        logFile = `[${dateTimeToString(date)}] Update error. ${error}\n` + logFile
        await fsPromises.writeFile(__dirname + '/log.txt', logFile)   // ошибка в лог

        process.exit()
    }

})();
