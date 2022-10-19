const puppeteer = require('puppeteer')
const fs = require('fs').promises
const config = require("./config.json")

//save cookie function
const saveCookie = async (page) => {
    const cookies = await page.cookies()
    const cookieJson = JSON.stringify(cookies, null, 2)
    await fs.writeFile(__dirname + '/cookies.json', cookieJson)
}

//load cookie function
const loadCookie = async (page) => {
    const cookieJson = await fs.readFile(__dirname + '/cookies.json')
    const cookies = JSON.parse(cookieJson)
    await page.setCookie(...cookies)
}

const getData = async () => {
    const jsonStr = await fs.readFile(__dirname + '/data.json')
    return JSON.parse(jsonStr)
}

const saveData = async (data) => {
    await fs.writeFile(__dirname + '/data.json', JSON.stringify(data, null, 2))
}

(async () => {
    try {
        await fs.writeFile(__dirname + '/cookies.json', "[]");   // clear cookies

        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')
        await loadCookie(page); //load cookie
        await page.goto(config.WATCHING_URL,
            { waitUntil: 'domcontentloaded' })
        await saveCookie(page); //save cookie

        await page.waitForSelector('script[type="application/ld+json"]')
        const result = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]').innerHTML)

        const json = JSON.parse(result)
        const info = {
            name: json["name"],
            description: json["description"],
            url: json["offers"]["url"],
            price: json["offers"]["price"],
            currency: json["offers"]["priceCurrency"],
            image: json["image"],
            date: new Date()
        }

        const prevData = await getData()

        if (prevData.price > info.price) {
            const sendMessagePage = await browser.newPage()
            await sendMessagePage.goto(`https://maker.ifttt.com/trigger/${config.IFTTT_EVENT}/with/key/${config.IFTTT_KEY}?value1=${info.name}&value2=${prevData.price}&value3=${info.price}`)
        }
        await saveData(info)

        await browser.close()
        await fs.writeFile(__dirname + '/cookies.json', "[]")   // clear cookies
    } catch (error) {
        console.log(error)
    }

})();
